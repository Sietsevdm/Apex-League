import { createHash } from "node:crypto";
import { changesBetween, type StateDelta } from "./state-delta";

/** Hash the exact privacy-filtered JSON, including identity, scope and deadline visibility. */
export function versioned<T>(data: T): T & { revision?: string } {
  const clean = JSON.parse(JSON.stringify(data));
  if (!clean.authenticated) return clean;
  delete clean.revision;
  return {
    ...clean,
    revision: createHash("sha256").update(JSON.stringify(clean)).digest("hex"),
  };
}

export function mutationResponse(before: any, after: any, base: string | null) {
  if (
    !base ||
    before?.revision !== base ||
    !after.authenticated ||
    before.userId !== after.userId ||
    JSON.stringify(before.context) !== JSON.stringify(after.context)
  )
    return after;
  const delta: StateDelta = {
    delta: true,
    base,
    revision: after.revision,
    changes: changesBetween(before, after).filter(
      (change) => change.path[0] !== "revision",
    ),
  };
  return JSON.stringify(delta).length < JSON.stringify(after).length
    ? delta
    : after;
}
