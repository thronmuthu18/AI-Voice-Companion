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
            ? "bg-blue-600 text-white shadow-lg"
            : "text-slate-300 hover:bg-slate-800 hover:text-white"
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