import { notFound, redirect } from "next/navigation";
import { getAllGaugeIds, getGaugeConfig } from "@/lib/gauges-data";

/**
 * Retired as a content route — R8 (DESIGN.md): "one gauge, one plate, one
 * citable address." /table/[plate] is now canonical; every legacy
 * /gauges/[slug] URL redirects there rather than generating its own page,
 * so nothing on or off this site ever has two live addresses for the same
 * gauge to cite. One gauge, one plate, always (see the housing-pressure
 * fix in CLAUDE.md/DESIGN.md) — `Object.values(config.plates)` is asserted
 * to have exactly that one entry, the plate this redirects to.
 */
export function generateStaticParams() {
  return getAllGaugeIds().map((slug) => ({ slug }));
}

export default async function GaugeDetailRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const config = getGaugeConfig(slug);
  if (!config) notFound();

  const plates = Object.values(config.plates);
  if (plates.length !== 1) {
    throw new Error(
      `${config.id}: expected exactly one plate to redirect to (R8 — one gauge, one plate), found ` +
        `${plates.length}: ${JSON.stringify(config.plates)}.`
    );
  }

  redirect(`/table/${plates[0]}`);
}
