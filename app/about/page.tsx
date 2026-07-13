import { getSiteContent } from "@/lib/content";

export const metadata = { title: "About — The Australia Scorecard" };

export default function AboutPage() {
  const content = getSiteContent();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold">About</h1>
      <p className="mt-2 text-sm text-[var(--text-muted)]">
        This entire page is placeholder copy — edit{" "}
        <code className="rounded bg-[var(--surface-1)] px-1.5 py-0.5">content/site.json</code>{" "}
        directly, no code changes needed.
      </p>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Mission</h2>
        <p className="mt-2 text-[var(--text-secondary)]">{content.about.mission}</p>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-semibold">Independence</h2>
        <p className="mt-2 text-[var(--text-secondary)]">{content.about.independence}</p>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-semibold">Contact</h2>
        <p className="mt-2 text-[var(--text-secondary)]">{content.about.contact}</p>
      </section>
    </div>
  );
}
