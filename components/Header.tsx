import Link from "next/link";

export default function Header() {
  return (
    <header className="border-b border-[var(--gridline)] bg-[var(--surface-1)]">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4">
        <Link href="/" className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">
          The Australia Scorecard
        </Link>
        <nav className="flex flex-wrap gap-5 text-sm text-[var(--text-secondary)]">
          <Link href="/" className="hover:text-[var(--text-primary)]">
            Home
          </Link>
          <Link href="/methodology" className="hover:text-[var(--text-primary)]">
            Methodology
          </Link>
          <Link href="/about" className="hover:text-[var(--text-primary)]">
            About
          </Link>
        </nav>
      </div>
    </header>
  );
}
