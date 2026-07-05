import { useEffect, useState } from "react";
import AppShell from "../components/layout/AppShell";
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
      <div className="max-w-2xl mx-auto mt-6">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/40 backdrop-blur-xl shadow-2xl p-8 space-y-8">
          
          <div>
            <h2 className="text-xl font-bold text-white mb-1">Preferences</h2>
            <p className="text-slate-400 text-sm">Customize your MuthuAI system interface</p>
          </div>

          <div className="space-y-6">
            {/* Theme Select */}
            <div className="flex items-center justify-between py-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-slate-800 text-slate-400">
                  {theme === "dark" ? <Moon size={18} /> : <Sun size={18} />}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Interface Theme</p>
                  <p className="text-xs text-slate-400">Switch between light and dark modes</p>
                </div>
              </div>

              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="
                  rounded-xl
                  bg-slate-850
                  border
                  border-slate-700
                  text-slate-100
                  text-sm
                  px-3
                  py-2
                  outline-none
                  focus:border-blue-500
                  transition
                "
              >
                <option value="light">Light Mode</option>
                <option value="dark">Dark Mode</option>
              </select>
            </div>

            {/* Voice Assistant Auto Read */}
            <div className="flex items-center justify-between py-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-slate-800 text-slate-400">
                  <Volume2 size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Auto Speak responses</p>
                  <p className="text-xs text-slate-400">Automatically read aloud incoming assistant messages</p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={voiceAutoSpeak}
                  onChange={(e) => setVoiceAutoSpeak(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-300 after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Security Info */}
            <div className="flex items-center gap-3 py-4">
              <div className="p-2 rounded-xl bg-slate-800 text-slate-400">
                <Shield size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Secure Encrypted Session</p>
                <p className="text-xs text-slate-400">MuthuAI sessions are encrypted using secure JSON Web Tokens</p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </AppShell>
  );
}
