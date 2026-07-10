export function initTheme() {
  const savedTheme = localStorage.getItem("muthuai_theme") || "dark";
  const root = window.document.documentElement;
  if (savedTheme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}
