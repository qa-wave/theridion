export type ThemeId = "cobweb" | "violet" | "amber" | "arctic";

export interface ThemeDef {
  id: ThemeId;
  label: string;
  dot: string; // tailwind color class for preview dot
}

export const THEMES: ThemeDef[] = [
  { id: "cobweb", label: "Cobweb Teal", dot: "bg-cyan-400" },
  { id: "violet", label: "Violet Haze", dot: "bg-violet-400" },
  { id: "amber", label: "Amber Forge", dot: "bg-amber-400" },
  { id: "arctic", label: "Arctic Blue", dot: "bg-indigo-400" },
];

const STORAGE_KEY = "theridion.theme";

export function loadTheme(): ThemeId {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && THEMES.some((t) => t.id === stored)) return stored as ThemeId;
  return "cobweb";
}

export function applyTheme(id: ThemeId): void {
  const html = document.documentElement;
  // Remove all theme classes, then add the selected one.
  for (const t of THEMES) html.classList.remove(`theme-${t.id}`);
  html.classList.add(`theme-${id}`);
  localStorage.setItem(STORAGE_KEY, id);
}
