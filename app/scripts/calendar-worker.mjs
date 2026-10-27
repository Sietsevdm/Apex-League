const endpoint =
  process.env.CALENDAR_SYNC_URL || "http://apex:3000/api/calendar-sync";
const secret = process.env.CALENDAR_SYNC_SECRET;
if (!secret || secret.length < 32)
  throw new Error("Set CALENDAR_SYNC_SECRET to at least 32 random characters.");
async function run() {
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(180000),
    });
    if (!response.ok)
      throw new Error(`Calendar scheduler returned ${response.status}`);
    const result = await response.json();
    if (result.results?.length) console.log("Results check:", JSON.stringify(result.results));
    if (result.outcomes?.length)
      console.log("Calendar check:", JSON.stringify(result.outcomes));
    if (result.backup === "created" || result.backup === "failed")
      console.log("Daily backup:", result.backup);
  } catch (error) {
    console.error(error.message);
  }
}
await run();
setInterval(run, 3600000);
const pushEndpoint = new URL("/api/push-reminders", endpoint);
let pushing = false;
async function pushReminders() {
  if (pushing) return;
  pushing = true;
  try {
    const response = await fetch(pushEndpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(120000),
    });
    if (!response.ok)
      throw new Error(`Push scheduler returned ${response.status}`);
    const result = await response.json();
    if (result.sent || result.failed)
      console.log("Push reminders:", JSON.stringify(result));
  } catch (error) {
    console.error(error.message);
  } finally {
    pushing = false;
  }
}
await pushReminders();
setInterval(pushReminders, 300000);
