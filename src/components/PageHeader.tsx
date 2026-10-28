export default function PageHeader({ title, sub, demo }: { title: string; sub?: string; demo?: boolean }) {
  return (
    <header className="px-4 pb-3 pt-[calc(1.25rem+env(safe-area-inset-top))]">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold tracking-wide uppercase">{title}</h1>
        {demo && <span className="rounded-full border border-line px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted">Demo data</span>}
      </div>
      {sub && <p className="mt-0.5 text-sm text-muted">{sub}</p>}
    </header>
  );
}
