import type { CSSProperties } from "react";
import type { ClientData } from "./client-data";
import { themes } from "./theme";
import { fontFamilies, resolvedFonts, fontGroups } from "./typography";

export function appearanceStyle(
  data: Pick<ClientData, "theme" | "typography">,
): CSSProperties {
  const theme = data.theme || themes[0];
  return {
    "--bg": theme.background,
    "--surface": theme.surface,
    "--accent": theme.accent,
    "--gold": theme.highlight,
    "--text": theme.text,
    "--muted": theme.muted,
    "--font-scale":
      (data.typography?.groups?.body?.size || data.typography?.text || 100) /
      100,
    "--heading-scale":
      (data.typography?.groups?.heading?.size ||
        data.typography?.headings ||
        100) / 100,
    "--banner-scale":
      (data.typography?.groups?.banner?.size ||
        data.typography?.banner ||
        100) / 100,
    ...Object.fromEntries(
      fontGroups.flatMap((key) => {
        const v = resolvedFonts(data.typography)[key];
        return [
          [`--${key}-family`, fontFamilies[v.family]],
          [`--${key}-size`, v.size / 100],
          [`--${key}-weight`, v.weight],
          [`--${key}-height`, v.lineHeight],
          [`--${key}-spacing`, `${v.spacing}px`],
        ];
      }),
    ),
  } as CSSProperties;
}
