import Link from "next/link";

/**
 * A gauge reused across dimensions (housing-pressure is the only current
 * case) gets exactly one citable plate, its primary dimension's — DESIGN.md
 * R8's amendment. On the *other* dimension's grid it renders as this
 * cross-reference card instead of a second full GaugeCard, matching
 * `/section/[n]`'s own cross-reference row exactly (same wording, same
 * rule): never a second `Table X.Y` for one gauge.
 */
export default function CrossReferenceCard({
  name,
  primaryPlate,
  primaryDimensionName,
  countsTowardComposite,
}: {
  name: string;
  primaryPlate: string;
  primaryDimensionName: string;
  countsTowardComposite: boolean;
}) {
  return (
    <div className="border border-grid bg-paper p-4 font-public-sans text-ink-2 text-[13px] leading-[1.6]">
      <span className="font-semibold text-ink">{name}</span> — scored in {primaryDimensionName}, not a
      separate table here.{" "}
      <Link href={`/table/${primaryPlate}`} className="underline decoration-chrome hover:decoration-ink">
        See Table {primaryPlate}
      </Link>
      {countsTowardComposite ? " (still counted in this dimension's composite)." : ""}
    </div>
  );
}
