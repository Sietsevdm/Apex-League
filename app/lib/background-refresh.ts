type Options<T> = {
  load: (signal: AbortSignal) => Promise<T>;
  onData: (data: T) => void;
  onError: (error: Error) => void;
  active: () => boolean;
  subscribe: (changed: () => void) => () => void;
  now?: () => number;
  interval?: number;
  initiallyStale?: boolean;
  setTimer?: (callback: () => void, delay: number) => unknown;
  clearTimer?: (timer: unknown) => void;
};

/** One refresh at a time, only while visible/online and no save is in progress. */
export function backgroundRefresh<T>(options: Options<T>) {
  const now = options.now || Date.now;
  const interval = options.interval || 60_000;
  const setTimer =
    options.setTimer || ((callback, delay) => setTimeout(callback, delay));
  const clearTimer =
    options.clearTimer ||
    ((timer) => clearTimeout(timer as ReturnType<typeof setTimeout>));
  let lastCheck = now() - (options.initiallyStale ? interval : 0);
  let timer: unknown;
  let request: AbortController | undefined;
  let generation = 0;
  let writes = 0;
  let disposed = false;

  function cancel() {
    generation++;
    if (timer !== undefined) clearTimer(timer);
    timer = undefined;
    request?.abort();
    // Keep the slot occupied until the old promise settles, even if it ignores abort.
  }
  function schedule() {
    if (timer !== undefined) clearTimer(timer);
    timer = undefined;
    if (disposed || writes || request || !options.active()) return;
    timer = setTimer(
      () => {
        timer = undefined;
        void refresh();
      },
      Math.max(0, interval - (now() - lastCheck)),
    );
  }
  async function refresh() {
    if (disposed || writes || request || !options.active()) return;
    const controller = new AbortController();
    const version = generation;
    request = controller;
    const current = () =>
      !disposed &&
      !controller.signal.aborted &&
      version === generation &&
      !writes &&
      options.active();
    try {
      const data = await options.load(controller.signal);
      if (current()) {
        lastCheck = now();
        options.onData(data);
      }
    } catch (error) {
      if (current()) {
        lastCheck = now(); // Failed requests retry after a minute, without a tight loop.
        options.onError(error as Error);
      }
    } finally {
      request = undefined;
      schedule();
    }
  }
  const unsubscribe = options.subscribe(() => {
    if (!options.active()) cancel();
    schedule();
  });
  schedule();
  return {
    beginWrite() {
      writes++;
      cancel();
      let finished = false;
      return (freshState = false) => {
        if (finished) return;
        finished = true;
        writes--;
        if (freshState) lastCheck = now();
        schedule();
      };
    },
    dispose() {
      disposed = true;
      cancel();
      unsubscribe();
    },
  };
}
