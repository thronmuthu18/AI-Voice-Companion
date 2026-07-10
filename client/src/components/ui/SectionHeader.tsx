
interface SectionHeaderProps {
  title: string;
  subtitle?: string;
}

export default function SectionHeader({ title, subtitle }: SectionHeaderProps) {
  return (
    <div className="space-y-1 pb-4 border-b border-slate-200/50 dark:border-slate-800/40">
      <h3 className="text-lg font-bold text-slate-800 dark:text-white">
        {title}
      </h3>
      {subtitle && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {subtitle}
        </p>
      )}
    </div>
  );
}
