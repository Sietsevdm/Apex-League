export const CALENDAR_FAILURE_FALLBACK =
  "The calendar check failed without an error detail. Use Check now to retry.";
/** Always persist a useful bounded reason, including non-Error failures. */
export function calendarErrorMessage(error: unknown) {
  const value =
    typeof error === "string"
      ? error
      : (error as { message?: unknown } | null)?.message;
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, 400)
    : CALENDAR_FAILURE_FALLBACK;
}
