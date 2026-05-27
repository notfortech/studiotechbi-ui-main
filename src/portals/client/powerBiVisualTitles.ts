import type { Report } from "powerbi-client";

const MAX_TITLES = 50;

function friendlyVisualType(raw: unknown): string {
  if (typeof raw !== "string" || !raw.trim()) return "Visual";
  const s = raw.trim();
  const spaced = s
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim();
  if (!spaced) return "Visual";
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function readVisualLabel(v: unknown, index: number): string {
  if (!v || typeof v !== "object") {
    return `${friendlyVisualType(undefined)} ${index + 1}`;
  }
  const o = v as Record<string, unknown>;
  const title = o.title;
  if (typeof title === "string" && title.trim()) return title.trim();
  const name = o.name;
  if (typeof name === "string" && name.trim()) return name.trim();
  return `${friendlyVisualType(o.type)} ${index + 1}`;
}

/**
 * Collects up to 50 non-empty display labels for visuals on the report's active page.
 * Returns [] if the SDK throws or there are no visuals.
 */
export async function collectVisualTitlesFromReport(report: Report): Promise<string[]> {
  try {
    const page = await report.getActivePage();
    const visuals = await (
      page as unknown as { getVisuals: () => Promise<unknown[]> }
    ).getVisuals();
    if (!Array.isArray(visuals) || visuals.length === 0) return [];

    const labels: string[] = [];
    for (let i = 0; i < visuals.length; i++) {
      const label = readVisualLabel(visuals[i], i);
      if (label) labels.push(label);
    }
    return labels.slice(0, MAX_TITLES);
  } catch {
    return [];
  }
}
