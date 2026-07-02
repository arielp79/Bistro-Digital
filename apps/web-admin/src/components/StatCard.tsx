interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
}

export function StatCard({ label, value, sub }: StatCardProps) {
  return (
    <div className="bg-surface rounded-xl border border-primary/10 p-5 shadow-sm">
      <p className="text-sm text-primary/50">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs text-primary/40 mt-1">{sub}</p>}
    </div>
  );
}
