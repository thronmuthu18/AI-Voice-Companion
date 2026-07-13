export function initTheme() {
  // Migrate localStorage keys from MuthuAI to Champ.ai
  const oldKeys = [
    "muthuai_theme",
    "muthuai_speech_lang",
    "muthuai_auto_speak",
    "muthuai_access_token",
    "muthuai_refresh_token",
    "muthuai_user"
  ];
  oldKeys.forEach(oldKey => {
    const value = localStorage.getItem(oldKey);
    if (value !== null) {
      const newKey = oldKey.replace("muthuai_", "champai_");
      if (localStorage.getItem(newKey) === null) {
        localStorage.setItem(newKey, value);
      }
    }
  });

  const savedTheme = localStorage.getItem("champai_theme") || "dark";
  const root = window.document.documentElement;
  if (savedTheme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}
