import { Menu, X } from "lucide-react";
import { useState } from "react";
import Sidebar from "./Sidebar";

export default function MobileSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setOpen(true)}
        className="
          lg:hidden
          fixed
          top-4
          left-4
          z-50
          rounded-xl
          bg-slate-900
          border
          border-slate-800
          p-2
          text-white
        "
      >
        <Menu size={22} />
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="
            fixed
            inset-0
            z-40
            bg-black/60
            backdrop-blur-sm
          "
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed
          top-0
          left-0
          z-50
          h-full
          transition-transform
          duration-300
          ${open ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="relative">
          <Sidebar />

          <button
            onClick={() => setOpen(false)}
            className="
              absolute
              top-4
              right-4
              rounded-lg
              bg-slate-800
              p-2
              text-white
            "
          >
            <X size={20} />
          </button>
        </div>
      </div>
    </>
  );
}