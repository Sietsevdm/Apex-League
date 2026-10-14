import type { ClientData } from "./client-data";

export type Change = {
  path: (string | number)[];
  value?: unknown;
  remove?: true;
};
export type StateDelta = {
  delta: true;
  base: string;
  revision: string;
  changes: Change[];
};

/** Diff JSON values only; array length changes replace the array to preserve ordering. */
export function changesBetween(
  before: any,
  after: any,
  path: (string | number)[] = [],
): Change[] {
  if (JSON.stringify(before) === JSON.stringify(after)) return [];
  if (
    before &&
    after &&
    typeof before === "object" &&
    typeof after === "object" &&
    Array.isArray(before) === Array.isArray(after) &&
    (!Array.isArray(before) || before.length === after.length)
  ) {
    return [
      ...new Set([...Object.keys(before), ...Object.keys(after)]),
    ].flatMap((key) =>
      changesBetween(before[key], after[key], [
        ...path,
        Array.isArray(after) ? Number(key) : key,
      ]),
    );
  }
  return [
    {
      path,
      ...(after === undefined ? { remove: true as const } : { value: after }),
    },
  ];
}

export function applyDelta(
  current: ClientData,
  delta: StateDelta,
): ClientData | undefined {
  if (current.revision !== delta.base) return undefined;
  const next = structuredClone(current) as any;
  for (const change of delta.changes) {
    if (
      !change.path.length ||
      change.path.some((key) => ["__proto__", "prototype"].includes(String(key)))
    )
      throw new Error("Invalid state update.");
    let target = next;
    for (const key of change.path.slice(0, -1)) {
      if (!target || !Object.hasOwn(target, key))
        throw new Error("Invalid state update.");
      target = target[key];
    }
    const key = change.path.at(-1)!;
    if (change.remove) delete target[key];
    else target[key] = structuredClone(change.value);
  }
  next.revision = delta.revision;
  return next;
}
