import { notFound } from "next/navigation";
import Gauge from "@/components/Gauge";
import { buildGaugeView, NOT_ESTABLISHED, type Attribution } from "@/lib/gauge-view";
import { gaugesConfig, getAllPlates, getGaugeData, resolvePlate } from "@/lib/gauges-data";
import { REGISTER_DRAFT_LINES, REGISTER_DRAFT_CAUSES, REGISTER_CONTESTED_CAUSES } from "@/content/register-draft-lines";
import type { GaugeConfig } from "@/lib/types";

/**
 * R8's canonical citable route. /gauges/[slug] keeps generating too (Step 3
 * note in DESIGN.md / CLAUDE.md) — additions only, nothing retired this
 * pass. One gauge, one plate, always (see the housing-pressure fix) —
 * getAllPlates() reflects that invariant directly, so this route can never
 * accidentally generate two pages for the same gauge.
 */
export function generateStaticParams() {
  return getAllPlates().map(({ plate }) => ({ plate }));
}

/** DEFINITION dense-layer content: real, existing config prose (dataPolicy, when present) plus the source series name — never fabricated definitional text. */
function buildDefinition(config: GaugeConfig): string {
  const base = `${config.source.seriesName}, sourced from ${config.source.institution} (${config.source.seriesId}).`;
  return config.dataPolicy ? `${base} ${config.dataPolicy}` : base;
}

function buildSourcesNote(config: GaugeConfig): string {
  const cadence = config.accessType === "manual" ? "manually, on its own cadence" : "monthly, via the automated pipeline";
  return `${config.source.institution}, ${config.source.seriesName} (${config.source.seriesId}). This gauge is pulled ${cadence} — see the as-of date above for when this specific page's data was last retrieved, which is not always the same as the observation year.`;
}

function resolveCause(gaugeId: string): Attribution {
  if (REGISTER_DRAFT_CAUSES[gaugeId]) return { kind: "established", body: REGISTER_DRAFT_CAUSES[gaugeId] };
  if (REGISTER_CONTESTED_CAUSES[gaugeId]) return { kind: "contested", body: REGISTER_CONTESTED_CAUSES[gaugeId] };
  return NOT_ESTABLISHED;
}

export default async function TablePage({ params }: { params: Promise<{ plate: string }> }) {
  const { plate } = await params;
  const resolved = resolvePlate(plate);
  if (!resolved) notFound();
  const { config, dimensionId } = resolved;
  const data = getGaugeData(config.id);

  // A gauge can have a plate (R8 assigns one to every gauge, regardless of
  // maturity) with no data file yet — buildGaugeView refuses to build a
  // scored view with nothing behind it, on purpose. This is the honest
  // "awaiting data" render, REGISTER-styled but not the full <Gauge>
  // instrument, since there's no score, band, or apparatus content to show.
  if (!data) {
    return (
      <div className="register min-h-screen bg-desk py-10">
        <div className="mx-auto max-w-[720px] px-4 bg-paper p-8 font-public-sans text-ink">
          <div className="font-martian-mono text-[13px] font-bold tracking-[.1em]">TABLE {plate}</div>
          <h1 className="font-bold text-[28px] leading-[1.1] tracking-[-.01em] mt-2 mb-3">{config.name}</h1>
          <div className="font-martian-mono text-[11px] font-medium tracking-[.06em] uppercase text-stamp mb-4">
            AWAITING DATA
          </div>
          <p className="text-[15px] leading-[1.5] text-ink-2">
            This gauge is configured but has no data yet.{" "}
            {config.accessType === "manual"
              ? "It's in the manual data lane — see data/manual/README.md for the download template."
              : "The automated pipeline hasn't populated it yet — see /status for what's blocking its first entry."}
          </p>
        </div>
      </div>
    );
  }

  const view = buildGaugeView({
    config,
    data,
    gaugesConfig,
    dimensionId,
    plate,
    section: dimensionId === "power" ? 1 : 2,
    plainLine: REGISTER_DRAFT_LINES[config.id] ?? `[No draft plain-language line yet for ${config.id} — see content/register-draft-lines.ts.]`,
    definition: buildDefinition(config),
    sourcesNote: buildSourcesNote(config),
    cause: resolveCause(config.id),
    // precedent: left at the NOT_ESTABLISHED default — no gauge has drafted
    // PRECEDENT content yet, deliberately (site owner's explicit hold).
  });

  return (
    <div className="min-h-screen bg-desk py-10">
      <div className="mx-auto max-w-[1180px] px-4">
        <Gauge view={view} />
      </div>
    </div>
  );
}
