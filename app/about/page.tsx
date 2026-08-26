import { getSiteContent } from "@/lib/content";

export const metadata = { title: "About — The Australia Scorecard" };

/**
 * content/site.json's about.* fields are hand-written, hand-edited-before-
 * release slots (same pattern as the homepage's factOfRelease — see
 * app/page.tsx's isPlaceholderFact). A field left at its scaffold value
 * hides rather than rendering as literal "[PLACEHOLDER]" scaffolding to a
 * real visitor; each section reappears automatically the moment the site
 * owner replaces its placeholder. See CLAUDE.md for why this guard exists
 * on this page specifically — /about shipped without it once already.
 */
function isPlaceholder(value: string): boolean {
  return value.includes("[PLACEHOLDER]");
}

export default function AboutPage() {
  const content = getSiteContent();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold">About</h1>

      {!isPlaceholder(content.about.mission) && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold">Mission</h2>
          <p className="mt-2 text-[var(--text-secondary)]">{content.about.mission}</p>
        </section>
      )}

      {!isPlaceholder(content.about.independence) && (
        <section className="mt-6">
          <h2 className="text-lg font-semibold">Independence</h2>
          <p className="mt-2 text-[var(--text-secondary)]">{content.about.independence}</p>
        </section>
      )}

      <section className="mt-6">
        <h2 className="text-lg font-semibold">An evolving scorecard</h2>
        <p className="mt-2 text-[var(--text-secondary)]">
          {content.about.evolving} See{" "}
          <a href="/status" className="underline hover:text-[var(--text-primary)]">
            Data status
          </a>
          .
        </p>
      </section>

      {!isPlaceholder(content.about.contact) && (
        <section className="mt-6">
          <h2 className="text-lg font-semibold">Contact</h2>
          <p className="mt-2 text-[var(--text-secondary)]">{content.about.contact}</p>
        </section>
      )}
    </div>
  );
}
