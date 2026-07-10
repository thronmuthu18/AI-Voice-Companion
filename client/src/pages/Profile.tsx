import AppShell from "../components/layout/AppShell";
import PageShell from "../components/ui/PageShell";
import GlassPanel from "../components/ui/GlassPanel";
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
      <PageShell title="Profile" description="View and manage your account details and authentication status" noCard>
        <div className="grid md:grid-cols-2 gap-6 pt-4">
          {/* Left Column: Avatar & Logout Card */}
          <GlassPanel className="p-6 text-center space-y-6 flex flex-col justify-between shadow-xl">
            <div className="flex flex-col items-center">
              <div className="h-20 w-20 rounded-full bg-blue-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-blue-500/20 mb-4">
                {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
              </div>

              <h2 className="text-xl font-bold text-slate-800 dark:text-white leading-tight">{user?.name || "User Profile"}</h2>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">{user?.email}</p>
              
              <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase">
                <ShieldCheck size={14} />
                {user?.subscription || "Free Tier"} User
              </div>
            </div>
            
            <div className="pt-6 border-t border-slate-200/50 dark:border-slate-800/40">
              <Button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 bg-red-650 hover:bg-red-500 text-white font-semibold py-3 transition rounded-xl duration-200"
              >
                <LogOut size={16} />
                Sign Out
              </Button>
            </div>
          </GlassPanel>

          {/* Right Column: User specs details */}
          <GlassPanel className="p-6 space-y-6 shadow-xl">
            <h3 className="text-md font-bold text-slate-850 dark:text-white border-b border-slate-200/50 dark:border-slate-800/40 pb-3">
              Account Information
            </h3>

            <div className="space-y-5">
              <div className="flex items-center gap-4 text-slate-700 dark:text-slate-350">
                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
                  <User size={18} />
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Full Name</p>
                  <p className="text-slate-800 dark:text-white font-semibold text-sm">{user?.name || "N/A"}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-slate-700 dark:text-slate-350">
                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
                  <Mail size={18} />
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Email Address</p>
                  <p className="text-slate-800 dark:text-white font-semibold text-sm">{user?.email || "N/A"}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-slate-700 dark:text-slate-350">
                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
                  <Calendar size={18} />
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Member Since</p>
                  <p className="text-slate-800 dark:text-white font-semibold text-sm">{registerDate}</p>
                </div>
              </div>
            </div>
          </GlassPanel>
        </div>
      </PageShell>
    </AppShell>
  );
}
