/** Run a ticker only while visible; refresh immediately when returning. */
export function startVisibleTicker(
  tick: () => void,
  doc: Pick<
    Document,
    "hidden" | "addEventListener" | "removeEventListener"
  > = document,
  timers = {
    setInterval: (tick: () => void, ms: number) =>
      globalThis.setInterval(tick, ms),
    clearInterval: (timer: ReturnType<typeof setInterval>) =>
      globalThis.clearInterval(timer),
  },
) {
  let timer: ReturnType<typeof setInterval> | undefined;
  const sync = () => {
    if (timer !== undefined) timers.clearInterval(timer);
    timer = undefined;
    if (!doc.hidden) {
      tick();
      timer = timers.setInterval(tick, 1000);
    }
  };
  doc.addEventListener("visibilitychange", sync);
  sync();
  return () => {
    doc.removeEventListener("visibilitychange", sync);
    if (timer !== undefined) timers.clearInterval(timer);
  };
}
