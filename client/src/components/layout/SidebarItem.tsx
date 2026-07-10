import { NavLink } from "react-router-dom";
import type { LucideIcon } from "lucide-react";

interface SidebarItemProps {
  to: string;
  icon: LucideIcon;
  label: string;
  badge?: number;
  onClick?: () => void;
}

export default function SidebarItem({
  to,
  icon: Icon,
  label,
  badge,
  onClick,
}: SidebarItemProps) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `
        group
        flex
        items-center
        justify-between
        rounded-xl
        px-4
        py-3
        transition-all
        duration-300

        ${
          isActive
            ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
            : "text-slate-600 dark:text-slate-350 hover:bg-slate-200/50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white"
        }
      `
      }
    >
      <div className="flex items-center gap-3">
        <Icon size={20} />
        <span className="font-medium">{label}</span>
      </div>

      {badge !== undefined && badge > 0 && (
        <span className="rounded-full bg-blue-500 px-2 py-0.5 text-xs font-semibold text-white">
          {badge}
        </span>
      )}
    </NavLink>
  );
}