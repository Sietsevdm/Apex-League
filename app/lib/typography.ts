export const fontFamilies = {
  dm: '"DM Sans", system-ui, sans-serif',
  barlow: '"Barlow Condensed", sans-serif',
  system: "system-ui, sans-serif",
  arial: "Arial, sans-serif",
  georgia: "Georgia, serif",
  mono: "ui-monospace, monospace",
};
export type FontControl = {
  family: keyof typeof fontFamilies;
  size: number;
  weight: number;
  lineHeight: number;
  spacing: number;
};
export const fontGroups = [
  "body",
  "heading",
  "banner",
  "navigation",
  "buttons",
  "labels",
  "tables",
  "numbers",
  "loginTitle",
  "loginText",
] as const;
export type FontGroup = (typeof fontGroups)[number];
export type Typography = {
  text: number;
  headings: number;
  banner: number;
  groups?: Record<FontGroup, FontControl>;
};
export const defaultFonts = Object.fromEntries(
  fontGroups.map((key) => [
    key,
    {
      family: key === "heading" || key === "banner" || key === "loginTitle" ? "barlow" : "dm",
      size: 100,
      weight: key === "body" || key === "tables" || key === "loginText" ? 400 : 600,
      lineHeight: key === "heading" || key === "banner" || key === "loginTitle" ? 1.1 : 1.5,
      spacing: 0,
    },
  ]),
) as Record<FontGroup, FontControl>;
export function resolvedFonts(typography?: Typography) {
  return (
    (typography?.groups ? { ...defaultFonts, ...typography.groups } : undefined) ||
    (Object.fromEntries(
      fontGroups.map((key) => [
        key,
        {
          ...defaultFonts[key],
          size:
            key === "heading"
              ? typography?.headings || 100
              : key === "banner"
                ? typography?.banner || 100
                : typography?.text || 100,
        },
      ]),
    ) as Record<FontGroup, FontControl>)
  );
}
export function validFonts(
  groups: unknown,
): groups is Record<FontGroup, FontControl> {
  if (!groups || typeof groups !== "object") return false;
  return fontGroups.every((key) => {
    const v = (groups as Record<string, FontControl>)[key];
    return (
      v &&
      v.family in fontFamilies &&
      Number.isInteger(v.size) &&
      v.size >= 60 &&
      v.size <= 180 &&
      [400, 500, 600, 700, 800].includes(v.weight) &&
      Number.isFinite(v.lineHeight) &&
      v.lineHeight >= 1 &&
      v.lineHeight <= 2 &&
      Number.isFinite(v.spacing) &&
      Math.abs(v.spacing) <= 3
    );
  });
}
