// Shared "preferred report theme" — the single source of truth the feature
// map's RD-6 calls for: the colour theme picker lives on Report Designer;
// Report Generator reads whatever was last chosen there instead of offering
// its own picker. Client-side only (localStorage) since theme choice never
// needs to reach the backend for the deterministic path — it's applied to
// chart colours entirely in the browser.

const STORAGE_KEY = "stbi.preferredThemeId";
const DEFAULT_THEME_ID = "ocean-blue";

export function getPreferredThemeId(): string {
  if (typeof window === "undefined") return DEFAULT_THEME_ID;
  return localStorage.getItem(STORAGE_KEY) ?? DEFAULT_THEME_ID;
}

export function setPreferredThemeId(id: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, id);
}
