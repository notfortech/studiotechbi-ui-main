// Shared visual theme definitions + mini preview, used by the Report
// Generator's "Report Template" step. Moved out of any single page
// component so it isn't tied to one screen's lifecycle.
import type { ReactElement } from "react";

export const REPORT_THEMES = [
  { id: "warm-peach",   name: "Warm Peach",    primary: "#D4845A", dark: "#A85A2A", light: "#E8A878", bg: "#FBF4ED", label: "Elegant & warm" },
  { id: "ocean-blue",   name: "Ocean Blue",    primary: "#1E7FC1", dark: "#155A8A", light: "#4FA3D8", bg: "#EBF4FB", label: "Clean & professional" },
  { id: "forest",       name: "Forest Green",  primary: "#2D7A4F", dark: "#1E5235", light: "#5AAD7C", bg: "#EAF4EE", label: "Calm & trustworthy" },
  { id: "midnight",     name: "Midnight",      primary: "#6B5CE7", dark: "#4A3AB8", light: "#9B8FF0", bg: "#F0EEFB", label: "Bold & modern" },
  { id: "copper-gold",  name: "Copper Gold",   primary: "#C4882A", dark: "#8A5E1A", light: "#DFB060", bg: "#FBF4E8", label: "Premium & rich" },
  { id: "slate-pro",    name: "Slate Pro",     primary: "#4A6580", dark: "#2E3F52", light: "#7A96B0", bg: "#EDF1F5", label: "Minimal & sharp" },
] as const;

export type VisualTheme = (typeof REPORT_THEMES)[number];

export function themeById(id: string): VisualTheme {
  return REPORT_THEMES.find((t) => t.id === id) ?? REPORT_THEMES[0];
}

export function MiniReportPreview({ theme }: { theme: VisualTheme }): ReactElement {
  const circ = 2 * Math.PI * 20;
  return (
    <svg viewBox="0 0 220 115" width="100%" style={{ display: "block", borderRadius: 6, background: theme.bg }}>
      {[
        { x: 2,   label: "Revenue",  val: "$2.4M", color: theme.primary },
        { x: 76,  label: "Target %", val: "92%",   color: theme.dark },
        { x: 150, label: "Clients",  val: "318",   color: theme.light },
      ].map(({ x, label, val, color }) => (
        <g key={label}>
          <rect x={x} y={2} width={68} height={46} rx={4} fill={color} opacity={0.15} />
          <rect x={x} y={2} width={68} height={6}  rx={2} fill={color} />
          <text x={x + 34} y={28} textAnchor="middle" fontFamily="Inter,sans-serif" fontSize={13} fontWeight="bold" fill={theme.dark}>{val}</text>
          <text x={x + 34} y={41} textAnchor="middle" fontFamily="Inter,sans-serif" fontSize={8}  fill="#888">{label}</text>
        </g>
      ))}
      <circle cx={52} cy={85} r={20} fill="none" stroke={`${theme.primary}30`} strokeWidth={10} />
      <circle cx={52} cy={85} r={20} fill="none" stroke={theme.primary} strokeWidth={10}
        strokeDasharray={`${circ * 0.45} ${circ}`} strokeDashoffset={circ * 0.25} transform="rotate(-90 52 85)" />
      <circle cx={52} cy={85} r={20} fill="none" stroke={theme.light} strokeWidth={10}
        strokeDasharray={`${circ * 0.3} ${circ}`} strokeDashoffset={-circ * 0.2} transform="rotate(-90 52 85)" />
      <text x={52} y={88} textAnchor="middle" fontFamily="Inter,sans-serif" fontSize={9} fontWeight="bold" fill={theme.dark}>65%</text>
      <rect x={88} y={54} width={130} height={14} rx={2} fill={theme.primary} />
      <text x={92} y={64} fontFamily="Inter,sans-serif" fontSize={8} fontWeight="bold" fill="white">Category</text>
      <text x={148} y={64} fontFamily="Inter,sans-serif" fontSize={8} fontWeight="bold" fill="white">Amount</text>
      <text x={196} y={64} fontFamily="Inter,sans-serif" fontSize={8} fontWeight="bold" fill="white">%</text>
      {[{ cat: "Sales", amt: "1,240", pct: "45%" }, { cat: "Services", amt: "890", pct: "32%" }, { cat: "Other", amt: "632", pct: "23%" }]
        .map(({ cat, amt, pct }, i) => (
          <g key={cat}>
            <rect x={88} y={68 + i * 15} width={130} height={15} fill={i % 2 === 0 ? `${theme.primary}10` : "white"} />
            <text x={92}  y={79 + i * 15} fontFamily="Inter,sans-serif" fontSize={8} fill="#444">{cat}</text>
            <text x={148} y={79 + i * 15} fontFamily="Inter,sans-serif" fontSize={8} fill="#444">{amt}</text>
            <text x={196} y={79 + i * 15} fontFamily="Inter,sans-serif" fontSize={8} fill={theme.dark} fontWeight="600">{pct}</text>
          </g>
        ))}
    </svg>
  );
}
