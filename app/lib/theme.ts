import type { Theme } from "./model";
export const themes: Theme[] = [
  [
    "Night Race",
    "#0B1020",
    "#151D30",
    "#2DE2C4",
    "#F4C76B",
    "#F4F7FB",
    "#A6B3C8",
  ],
].map(([name, background, surface, accent, highlight, text, muted]) => ({
  name,
  background,
  surface,
  accent,
  highlight,
  text,
  muted,
}));
