// ── Monthly usage tracking (localStorage) ─────────────────────────────────
// Used by GenerateBlueprintButton to show a local credit counter while the
// credits endpoint is optional in the V2 API.

const BLUEPRINT_USAGE_KEY = 'blueprintUsage';

interface BlueprintUsageRecord { month: string; count: number; }

function getCurrentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function getBlueprintUsageThisMonth(clientCode: string): number {
  try {
    const raw = localStorage.getItem(`${BLUEPRINT_USAGE_KEY}_${clientCode}`);
    if (!raw) return 0;
    const rec: BlueprintUsageRecord = JSON.parse(raw);
    return rec.month === getCurrentMonth() ? rec.count : 0;
  } catch { return 0; }
}

export function incrementBlueprintUsage(clientCode: string): void {
  const current = getBlueprintUsageThisMonth(clientCode);
  const rec: BlueprintUsageRecord = { month: getCurrentMonth(), count: current + 1 };
  localStorage.setItem(`${BLUEPRINT_USAGE_KEY}_${clientCode}`, JSON.stringify(rec));
}

export function getNextResetDate(): string {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return next.toLocaleDateString('default', { month: 'long', day: 'numeric' });
}
