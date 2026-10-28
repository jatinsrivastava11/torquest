export default function PageHeader({ title, sub, children }: { title: string; sub?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <header className="flex items-end justify-between gap-4 px-4 pb-4 pt-[calc(1.25rem+env(safe-area-inset-top))] md:px-6 md:pt-6">
      <div>
        <h1 className="text-[20px] font-semibold leading-7">{title}</h1>
        {sub && <p className="mt-0.5 text-[14px] text-muted">{sub}</p>}
      </div>
      {children}
    </header>
  );
}
