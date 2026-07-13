// Copies /data/processed/*.json into /public/data/processed/ so the "Download
// data" buttons on gauge pages can link to a real static file. Runs
// automatically before `npm run dev` and `npm run build`.
import { readdirSync, mkdirSync, copyFileSync } from "fs";
import { join } from "path";

const src = join(process.cwd(), "data", "processed");
const dest = join(process.cwd(), "public", "data", "processed");

mkdirSync(dest, { recursive: true });

const files = readdirSync(src).filter((f) => f.endsWith(".json"));
for (const file of files) {
  copyFileSync(join(src, file), join(dest, file));
}

console.log(`Synced ${files.length} gauge data file(s) to public/data/processed/`);
