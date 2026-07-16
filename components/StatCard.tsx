export default function StatCard({
  icon,
  iconBg,
  label,
  sublabel,
  value,
  badge,
  valueColor = "text-black",
}: {
  icon: string;
  iconBg: string;
  label: string;
  sublabel: string;
  value: string;
  badge?: string;
  valueColor?: string;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${iconBg}`}>
          {icon}
        </div>
        {badge && (
          <span className="text-xs font-medium bg-black/5 rounded-full px-3 py-1">
            {badge}
          </span>
        )}
      </div>
      <p className={`text-2xl font-extrabold mt-4 ${valueColor}`}>{value}</p>
      <p className="text-sm font-medium mt-1">{label}</p>
      <p className="text-xs text-black/40">{sublabel}</p>
    </div>
  );
}
