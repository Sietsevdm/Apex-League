"use client";
import type { Call } from "@/lib/client-data";
import { useLocale } from "@/lib/i18n";
import { State } from "@/lib/model";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
const TypographyEditor = dynamic(
  () => import("../LeagueExtras").then((m) => m.TypographyEditor),
  { loading: () => null },
);
function luminance(hex: string) {
  const rgb = hex
    .slice(1)
    .match(/.{2}/g)!
    .map((x) => parseInt(x, 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}
function contrast(a: string, b: string) {
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
function HexEditor({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const { t: tr, language, setLanguage, date } = useLocale();
  const [input, setInput] = useState(value);
  useEffect(() => setInput(value), [value]);
  return (
    <input
      aria-label={tr(label)}
      value={input}
      maxLength={7}
      onChange={(e) => {
        setInput(e.target.value);
        if (/^#[\da-f]{6}$/i.test(e.target.value)) onChange(e.target.value);
      }}
      onBlur={() => {
        if (!/^#[\da-f]{6}$/i.test(input)) setInput(value);
      }}
    />
  );
}
function Appearance({ s, call }: { s: State; call: Call }) {
  return <TypographyEditor s={s} call={call} />;
}
export default Appearance;
