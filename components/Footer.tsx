export default function Footer() {
  return (
    <footer className="mt-16 border-t border-[var(--gridline)] py-8">
      <div className="mx-auto max-w-5xl px-4 text-sm text-[var(--text-muted)]">
        <p>
          The Australia Scorecard is an independent, free, ad-free project. Every
          number on this site links back to its original published source — see{" "}
          <a href="/methodology" className="underline hover:text-[var(--text-secondary)]">
            Methodology
          </a>{" "}
          and{" "}
          <a href="/status" className="underline hover:text-[var(--text-secondary)]">
            Data status
          </a>
          .
        </p>
      </div>
    </footer>
  );
}
