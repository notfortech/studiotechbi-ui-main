/**
 * Frontend-only palette override for an already-assembled HTML report. No backend round-trip —
 * this rebuilds the `srcDoc` string client-side before the iframe ever renders it.
 *
 * Why this has to work by rewriting the HTML string rather than reaching into the iframe's DOM:
 * ReportResultsStep renders the report in `<iframe sandbox="allow-scripts" srcDoc={...}>` with no
 * `allow-same-origin` (deliberately — see that component's own comment on why). A sandboxed
 * iframe without allow-same-origin gets an opaque origin, so the parent can never touch its
 * `contentDocument`/`contentWindow` from outside — there's no direct-manipulation path available.
 * Instead, this mirrors koru-main's own server-side mechanism (HtmlReportAssemblyService.
 * ApplyThemeOverride): insert a `<style id="stbi-client-palette-override">:root{...}</style>`
 * block declaring the palette's colors against the template's own CSS custom property names,
 * placed right after the template's first `</style>` close tag so the cascade (later declaration
 * of equal specificity wins) makes it win over the template's authored defaults without ever
 * editing them.
 *
 * Known limitation, disclosed rather than hidden: this needs to know which CSS variable names a
 * given template actually declares (see TEMPLATE_SLOT_MAP below) — that mapping lives in each
 * template's manifest.json server-side (`themeSlots`), which isn't exposed to the frontend today.
 * A template not listed here falls back to declaring every variable name known across all listed
 * templates at once (harmless — CSS silently ignores a custom property a template never
 * declared), so an unrecognized template still gets *some* useful palette effect, just not a
 * guaranteed-complete one. Onboarding a template with yet another naming convention would need a
 * one-line addition here to get full coverage.
 */

export interface ReportPalette {
  name: string;
  /** Hex colors, one per semantic slot -- same 4-slot shape the server-side theme override
   * already uses (VisualTheme's primary/dark/light/bg, see reportThemes.tsx). */
  primary: string;
  secondary: string;
  accent: string;
  background: string;
}

/** 6 palettes, each chosen for strong primary/background contrast (so text stays legible)
 * while still reading as distinct from one another -- not just hue-rotations of the same look. */
export const REPORT_PALETTES: ReportPalette[] = [
  { name: 'Ocean Blue', primary: '#1668A0', secondary: '#0B3D5C', accent: '#38BDF8', background: '#F0F7FC' },
  { name: 'Slate & Amber', primary: '#334155', secondary: '#1E293B', accent: '#F59E0B', background: '#F8FAFC' },
  { name: 'Forest Green', primary: '#166534', secondary: '#14532D', accent: '#4ADE80', background: '#F0FDF4' },
  { name: 'Crimson & Charcoal', primary: '#991B1B', secondary: '#292524', accent: '#FB923C', background: '#FAFAF9' },
  { name: 'Violet Dusk', primary: '#6B5CE7', secondary: '#3B2F8F', accent: '#F472B6', background: '#F5F3FF' },
  { name: 'Teal & Coral', primary: '#0F766E', secondary: '#134E4A', accent: '#FB7185', background: '#F0FDFA' },
];

/** Per-template CSS custom-property names for each semantic slot, mirroring that template's own
 * manifest.json `themeSlots` block exactly (see HtmlTemplateSeedCatalog.cs in koru-main, or the
 * corresponding manifest.json in DashboardTemplateLibrary/templates/html/<id>/). */
const TEMPLATE_SLOT_MAP: Record<string, { primary: string; secondary: string; accent: string; background: string }> = {
  'retail-single-page': { primary: '--brand', secondary: '--brand2', accent: '--brand3', background: '--bg' },
  'healthcare-fpna-multi-tab': { primary: '--brand', secondary: '--brand-mid', accent: '--brand-light', background: '--bg' },
};

/** Union of every CSS variable name across every known template's slot map, used as the fallback
 * when the template id isn't recognized -- declares more than a given template needs, which CSS
 * silently ignores for the unused ones. */
function fallbackCssVars(): string[] {
  const set = new Set<string>();
  for (const slots of Object.values(TEMPLATE_SLOT_MAP)) {
    set.add(slots.primary);
    set.add(slots.secondary);
    set.add(slots.accent);
    set.add(slots.background);
  }
  return Array.from(set);
}

const STYLE_OVERRIDE_ID = 'stbi-client-palette-override';

/** Returns `html` with the palette override style block applied, or unchanged if `html` doesn't
 * contain a `</style>` tag to anchor on (fails soft — never throws, never corrupts the markup). */
export function applyReportPalette(html: string, templateId: string | null | undefined, palette: ReportPalette): string {
  if (!html) return html;

  const slots = templateId ? TEMPLATE_SLOT_MAP[templateId] : undefined;
  const declarations = slots
    ? [
        `${slots.primary}:${palette.primary}`,
        `${slots.secondary}:${palette.secondary}`,
        `${slots.accent}:${palette.accent}`,
        `${slots.background}:${palette.background}`,
      ]
    : fallbackCssVars().map((cssVar, i) => {
        // Assign in a fixed round-robin across the 4 slot colors so the fallback still reads as
        // a coherent palette rather than every unknown variable collapsing to one color.
        const values = [palette.primary, palette.secondary, palette.accent, palette.background];
        return `${cssVar}:${values[i % values.length]}`;
      });

  const styleBlock = `<style id="${STYLE_OVERRIDE_ID}">:root{${declarations.join(';')}}</style>`;

  const styleCloseIndex = html.toLowerCase().indexOf('</style>');
  if (styleCloseIndex >= 0) {
    const insertAt = styleCloseIndex + '</style>'.length;
    return html.slice(0, insertAt) + styleBlock + html.slice(insertAt);
  }

  const bodyCloseIndex = html.toLowerCase().lastIndexOf('</body>');
  if (bodyCloseIndex >= 0) {
    return html.slice(0, bodyCloseIndex) + styleBlock + html.slice(bodyCloseIndex);
  }

  return html + styleBlock;
}
