import { useEffect, useState } from "react";
import AppShell from "../components/layout/AppShell";
import PageShell from "../components/ui/PageShell";
import GlassPanel from "../components/ui/GlassPanel";
import { Moon, Sun, Volume2, Shield } from "lucide-react";

export default function Settings() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("muthuai_theme") || "dark";
  });

  const [voiceAutoSpeak, setVoiceAutoSpeak] = useState(() => {
    return localStorage.getItem("muthuai_auto_speak") === "true";
  });

  // Apply theme class to document element on changes
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("muthuai_theme", theme);
  }, [theme]);

  // Sync auto speak setting
  useEffect(() => {
    localStorage.setItem("muthuai_auto_speak", String(voiceAutoSpeak));
  }, [voiceAutoSpeak]);

  return (
    <AppShell>
      <PageShell title="Settings" description="Configure your MuthuAI system interface settings and configurations" noCard>
        <div className="grid md:grid-cols-2 gap-6 pt-4">
          {/* Card 1: Appearance Bento Card */}
          <GlassPanel className="p-6 space-y-4 flex flex-col justify-between shadow-xl">
            <div>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
                  {theme === "dark" ? <Moon size={20} /> : <Sun size={20} />}
                </div>
                <div>
                  <h3 className="text-md font-bold text-slate-800 dark:text-white">Interface Theme</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Switch between light and dark modes</p>
                </div>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-4 leading-relaxed">
                Choose between a bright pearl mist mode or a deep space atmospheric mode for your user interface.
              </p>
            </div>
            <div className="pt-4 border-t border-slate-200/50 dark:border-slate-800/40">
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="
                  w-full
                  rounded-xl
                  bg-white/40
                  dark:bg-slate-900/60
                  border
                  border-slate-200/50
                  dark:border-slate-800
                  text-slate-800
                  dark:text-slate-100
                  text-sm
                  px-3
                  py-2.5
                  outline-none
                  focus:border-blue-500
                  transition
                "
              >
                <option value="light">Light Mode</option>
                <option value="dark">Dark Mode</option>
              </select>
            </div>
          </GlassPanel>

          {/* Card 2: Voice Preferences Bento Card */}
          <GlassPanel className="p-6 space-y-4 flex flex-col justify-between shadow-xl">
            <div>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
                  <Volume2 size={20} />
                </div>
                <div>
                  <h3 className="text-md font-bold text-slate-800 dark:text-white">Auto Speak Responses</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Read aloud incoming assistant messages</p>
                </div>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-4 leading-relaxed">
                When enabled, the application automatically speaks out responses in Tamil or English depending on language detection.
              </p>
            </div>
            <div className="pt-4 border-t border-slate-200/50 dark:border-slate-800/40 flex justify-between items-center">
              <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Auto Speak State</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={voiceAutoSpeak}
                  onChange={(e) => setVoiceAutoSpeak(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:after:bg-slate-300 peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </GlassPanel>

          {/* Card 3: Security & Session Bento Card */}
          <GlassPanel className="p-6 space-y-4 md:col-span-2 shadow-xl">
            <div className="flex items-start gap-4">
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20 mt-0.5">
                <Shield size={20} />
              </div>
              <div className="space-y-1">
                <h3 className="text-md font-bold text-slate-800 dark:text-white">Secure Encrypted Sessions</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  MuthuAI utilizes state-of-the-art JSON Web Token (JWT) standards to encrypt connection streams. Sessions remain protected on every exchange.
                </p>
              </div>
            </div>
          </GlassPanel>
        </div>
      </PageShell>
    </AppShell>
  );
}
