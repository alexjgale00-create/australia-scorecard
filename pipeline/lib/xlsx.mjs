// Minimal, dependency-free .xlsx reader. An .xlsx file is a ZIP archive of
// XML parts — this parses the ZIP central directory by hand and inflates
// entries with Node's built-in zlib, rather than adding an npm dependency
// for what's needed here: read named sheets, resolve shared strings,
// return cells by row/column. Verified live against a real SIPRI download
// before use — not written speculatively.
import { inflateRawSync } from "zlib";

function readZipEntries(buf) {
  let eocdOffset = -1;
  for (let i = buf.length - 22; i >= 0; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset === -1) throw new Error("Not a valid ZIP/xlsx file (no End Of Central Directory record found).");

  const entryCount = buf.readUInt16LE(eocdOffset + 10);
  const cdOffset = buf.readUInt32LE(eocdOffset + 16);

  const entries = {};
  let offset = cdOffset;
  for (let i = 0; i < entryCount; i++) {
    const sig = buf.readUInt32LE(offset);
    if (sig !== 0x02014b50) throw new Error(`Corrupt ZIP central directory at byte ${offset}.`);
    const compMethod = buf.readUInt16LE(offset + 10);
    const compSize = buf.readUInt32LE(offset + 20);
    const nameLen = buf.readUInt16LE(offset + 28);
    const extraLen = buf.readUInt16LE(offset + 30);
    const commentLen = buf.readUInt16LE(offset + 32);
    const localHeaderOffset = buf.readUInt32LE(offset + 42);
    const name = buf.toString("utf-8", offset + 46, offset + 46 + nameLen);
    entries[name] = { compMethod, compSize, localHeaderOffset };
    offset += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

function extractEntry(buf, entry) {
  const lh = entry.localHeaderOffset;
  const nameLen = buf.readUInt16LE(lh + 26);
  const extraLen = buf.readUInt16LE(lh + 28);
  const dataStart = lh + 30 + nameLen + extraLen;
  const compData = buf.subarray(dataStart, dataStart + entry.compSize);
  if (entry.compMethod === 0) return compData; // stored
  if (entry.compMethod === 8) return inflateRawSync(compData); // deflate
  throw new Error(`Unsupported ZIP compression method ${entry.compMethod} — this .xlsx wasn't produced the standard way.`);
}

function parseSharedStrings(xml) {
  if (!xml) return [];
  const siBlocks = xml.match(/<si>[\s\S]*?<\/si>/g) || [];
  return siBlocks.map((block) => [...block.matchAll(/<t[^>]*>([^<]*)<\/t>/g)].map((m) => m[1]).join(""));
}

function parseSheetRows(xml, sharedStrings) {
  const rows = {};
  const rowBlocks = xml.match(/<row [^>]*>[\s\S]*?<\/row>/g) || [];
  for (const rowXml of rowBlocks) {
    const rowNumMatch = rowXml.match(/<row [^>]*r="(\d+)"/);
    if (!rowNumMatch) continue;
    const rowNum = Number(rowNumMatch[1]);
    const cells = {};
    const cellBlocks = rowXml.match(/<c [^>]*\/>|<c [^>]*>[\s\S]*?<\/c>/g) || [];
    for (const cellXml of cellBlocks) {
      const refMatch = cellXml.match(/r="([A-Z]+)\d+"/);
      if (!refMatch) continue;
      const col = refMatch[1];
      const typeMatch = cellXml.match(/t="([^"]+)"/);
      const type = typeMatch ? typeMatch[1] : null;
      const vMatch = cellXml.match(/<v>([^<]*)<\/v>/);
      let value = vMatch ? vMatch[1] : null;
      if (value !== null && type === "s") value = sharedStrings[Number(value)] ?? `#REF${value}`;
      if (value === null && cellXml.includes('t="inlineStr"')) {
        const isMatch = cellXml.match(/<is>[\s\S]*?<t[^>]*>([^<]*)<\/t>/);
        value = isMatch ? isMatch[1] : "";
      }
      cells[col] = value;
    }
    rows[rowNum] = cells;
  }
  return rows;
}

/**
 * Loads an .xlsx file (as a Buffer) and returns { getSheet(name) }, where
 * getSheet returns { rows } — rows[rowNumber][columnLetters] = cell value
 * (numbers/dates come back as raw strings; text cells are already resolved
 * from the shared-string table).
 */
export function loadWorkbook(buf) {
  const entries = readZipEntries(buf);
  const getXml = (name) => (entries[name] ? extractEntry(buf, entries[name]).toString("utf-8") : null);

  const workbookXml = getXml("xl/workbook.xml");
  if (!workbookXml) throw new Error("This file has no xl/workbook.xml — not a valid .xlsx.");
  const sheetMeta = [...workbookXml.matchAll(/<sheet[^>]*name="([^"]+)"[^>]*r:id="(rId\d+)"/g)];

  const relsXml = getXml("xl/_rels/workbook.xml.rels");
  const ridToTarget = Object.fromEntries(
    [...(relsXml?.matchAll(/<Relationship[^>]*Id="(rId\d+)"[^>]*Target="([^"]+)"/g) ?? [])].map((m) => [m[1], m[2]])
  );

  const sharedStrings = parseSharedStrings(getXml("xl/sharedStrings.xml"));

  const sheetFileByName = {};
  for (const m of sheetMeta) {
    const [, name, rid] = m; // m[0] is the full match, m[1]/m[2] are the two capture groups
    const target = ridToTarget[rid];
    if (target) sheetFileByName[name] = target.startsWith("worksheets") ? `xl/${target}` : target;
  }

  return {
    sheetNames: Object.keys(sheetFileByName),
    getSheet(name) {
      const file = sheetFileByName[name];
      if (!file) {
        throw new Error(
          `No sheet named "${name}" in this workbook — available sheets: ${Object.keys(sheetFileByName).join(", ")}`
        );
      }
      const xml = getXml(file);
      if (!xml) throw new Error(`Sheet "${name}" maps to ${file}, but that part doesn't exist in the archive.`);
      return { rows: parseSheetRows(xml, sharedStrings) };
    },
  };
}
