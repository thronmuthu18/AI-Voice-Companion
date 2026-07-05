import AppShell from "../components/layout/AppShell";
import { useAuthStore } from "../stores/auth.store";
import { LogOut, User, Mail, Calendar, ShieldCheck } from "lucide-react";
import Button from "../components/ui/Button";

export default function Profile() {
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    if (confirm("Are you sure you want to sign out?")) {
      logout();
    }
  };

  const registerDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString([], {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Recently Joined";

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto mt-6">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/40 backdrop-blur-xl shadow-2xl p-8">
          {/* Avatar and Header */}
          <div className="flex flex-col items-center text-center pb-8 border-b border-slate-800">
            <div className="h-24 w-24 rounded-full bg-blue-600 flex items-center justify-center text-white text-4xl font-bold shadow-lg mb-4">
              {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
            </div>

            <h2 className="text-2xl font-bold text-white">{user?.name || "User Profile"}</h2>
            <p className="text-slate-400 text-sm mt-1">{user?.email}</p>
            
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-semibold text-blue-400 uppercase">
              <ShieldCheck size={14} />
              {user?.subscription || "Free Tier"} User
            </div>
          </div>

          {/* Details */}
          <div className="py-6 space-y-5">
            <div className="flex items-center gap-4 text-slate-300">
              <div className="p-2 rounded-xl bg-slate-800 text-slate-400">
                <User size={18} />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase font-semibold">Full Name</p>
                <p className="text-white font-medium">{user?.name || "N/A"}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-slate-300">
              <div className="p-2 rounded-xl bg-slate-800 text-slate-400">
                <Mail size={18} />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase font-semibold">Email Address</p>
                <p className="text-white font-medium">{user?.email || "N/A"}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-slate-300">
              <div className="p-2 rounded-xl bg-slate-800 text-slate-400">
                <Calendar size={18} />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase font-semibold">Member Since</p>
                <p className="text-white font-medium">{registerDate}</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-6 border-t border-slate-800">
            <Button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white font-semibold py-3 transition rounded-xl"
            >
              <LogOut size={18} />
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
