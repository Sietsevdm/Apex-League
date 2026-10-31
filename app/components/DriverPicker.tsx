"use client";
import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check } from "lucide-react";
import type { Season } from "@/lib/model";
import { driversByConstructor, driverOptionStyle } from "@/lib/driver-order";
import { teamLogo } from "@/lib/team-logos";
import { useLocale } from "@/lib/i18n";

export default function DriverPicker({
  value,
  onChange,
  season,
  none = false,
  disabled = false,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  season: Season;
  none?: boolean;
  disabled?: boolean;
  label?: string;
}) {
  const { t } = useLocale(),
    id = useId();
  const options = [
    { id: "", name: t("Choose a driver"), team: "", color: "" },
    ...(none
      ? [{ id: "none", name: t("No retirements"), team: "", color: "" }]
      : []),
    ...driversByConstructor(season.drivers),
  ];
  const selected = options.find((o) => o.id === value) || options[0];
  const [open, setOpen] = useState(false),
    [active, setActive] = useState(0);
  const [position, setPosition] = useState<{
    left: number;
    top: number;
    width: number;
    maxHeight: number;
  } & CSSProperties>();
  const trigger = useRef<HTMLButtonElement>(null),
    popup = useRef<HTMLDivElement>(null);
  const search = useRef({ value: "", at: 0 });
  const show = () => {
    if (!disabled) {
      setActive(
        Math.max(
          0,
          options.findIndex((o) => o.id === value),
        ),
      );
      setOpen(true);
    }
  };
  const choose = (index: number) => {
    if (!disabled && options[index]) {
      onChange(options[index].id);
      setOpen(false);
      trigger.current?.focus();
    }
  };
  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);
  useEffect(() => {
    if (!open) return;
    const place = () => {
      const rect = trigger.current?.getBoundingClientRect();
      if (!rect) return;
      const theme = getComputedStyle(trigger.current!);
      const height = window.innerHeight,
        below = height - rect.bottom - 12,
        above = rect.top - 12;
      const maxHeight = Math.min(360, Math.max(0, Math.max(below, above)));
      const viewportWidth = document.documentElement.clientWidth;
      const width = Math.min(Math.max(rect.width, 300), viewportWidth - 16);
      setPosition({
        fontFamily: theme.fontFamily, fontSize: theme.fontSize, color: theme.getPropertyValue("--text").trim() || "#F4F7FB",
        backgroundColor: theme.getPropertyValue("--surface").trim() || "#151D30", borderColor: theme.borderColor,
        left: Math.max(8, Math.min(rect.left, viewportWidth - width - 8)),
        top:
          below >= Math.min(360, above)
            ? rect.bottom + 4
            : Math.max(8, rect.top - maxHeight - 4),
        width,
        maxHeight,
      });
    };
    const outside = (e: PointerEvent) => {
      if (
        !trigger.current?.contains(e.target as Node) &&
        !popup.current?.contains(e.target as Node)
      )
        setOpen(false);
    };
    const scroll = (e: globalThis.Event) => {
      if (!popup.current?.contains(e.target as Node)) place();
    };
    place();
    document.addEventListener("pointerdown", outside);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", scroll, true);
    return () => {
      document.removeEventListener("pointerdown", outside);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", scroll, true);
    };
  }, [open]);
  useEffect(() => {
    if (open && position)
      popup.current
        ?.querySelector(`[data-index="${active}"]`)
        ?.scrollIntoView({ block: "nearest" });
  }, [active, open, position]);
  const badge = (team: string, color: string) => {
    const logo = teamLogo(team);
    return logo ? (
      <span className="driver-team-logo">
        <img src={logo} alt="" width="28" height="24" />
      </span>
    ) : color ? (
      <span className="driver-color" style={{ backgroundColor: color }} />
    ) : null;
  };
  return (
    <span className="driver-select driver-picker">
      <button
        ref={trigger}
        type="button"
        className="driver-picker-trigger"
        style={selected.color ? driverOptionStyle(selected.color) : undefined}
        role="combobox"
        aria-label={t(label || "Select driver")}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? id : undefined}
        aria-activedescendant={open ? `${id}-${active}` : undefined}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : show())}
        onBlur={(e) => {
          if (!popup.current?.contains(e.relatedTarget as Node)) setOpen(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Tab" || e.key === "Escape") {
            setOpen(false);
            return;
          }
          if (["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) {
            e.preventDefault();
            if (!open) {
              show();
              return;
            }
            setActive((i) =>
              e.key === "Home"
                ? 0
                : e.key === "End"
                  ? options.length - 1
                  : Math.max(
                      0,
                      Math.min(
                        options.length - 1,
                        i + (e.key === "ArrowDown" ? 1 : -1),
                      ),
                    ),
            );
            return;
          }
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (open) choose(active);
            else show();
            return;
          }
          if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            const now = Date.now();
            search.current = {
              value:
                (now - search.current.at < 700 ? search.current.value : "") +
                e.key.toLowerCase(),
              at: now,
            };
            const found = options.findIndex((o) =>
              o.name.toLowerCase().startsWith(search.current.value),
            );
            if (!open) show();
            if (found >= 0) setActive(found);
          }
        }}
      >
        {badge(selected.team, selected.color)}
        <span className="driver-picker-name">{selected.name}</span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      {open &&
        position &&
        createPortal(
          <div
            ref={popup}
            id={id}
            role="listbox"
            aria-label={t(label || "Select driver")}
            className="driver-picker-menu"
            style={position}
            onPointerDown={(e) => e.preventDefault()}
          >
            {options.map((o, i) => (
              <div
                id={`${id}-${i}`}
                key={o.id}
                role="option"
                aria-selected={o.id === value}
                data-index={i}
                data-active={active === i}
                className="driver-picker-option"
                style={o.color ? driverOptionStyle(o.color) : undefined}
                onPointerMove={() => setActive(i)}
                onClick={() => choose(i)}
              >
                {badge(o.team, o.color)}
                <span className="driver-picker-copy">
                  <span>{o.name}</span>
                  {o.team && <small>{o.team}</small>}
                </span>
                {o.id === value && <Check size={16} aria-hidden="true" />}
              </div>
            ))}
          </div>,
          document.body,
        )}
    </span>
  );
}
