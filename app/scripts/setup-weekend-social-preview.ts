import { seed } from "../lib/seed";
import { emptyResult } from "../lib/model";
import { promises as fs } from "node:fs";

async function main() {
  const s = seed(true), season = s.seasons[0];
  const time = (hours: number) => new Date(Date.now() + hours * 3600000).toISOString();
  const ids = season.drivers.map(d => d.id);
  const template = s.events[0];
  const baseUser = s.users[1];
  s.users = ["Sietse", "Alex", "Jamie", "Taylor", "Morgan", "Riley", "Charlie", "Jordan"].map((name, i) => ({ ...structuredClone(i === 0 ? s.users[0] : baseUser), id: i === 0 ? "demo-admin" : `demo-${i}`, name, email: `social-preview-${i}@example.invalid`, seasonIds: [season.id] }));
  const baseline = { ...template, id: "social-baseline", name: "Belgian Grand Prix", practice: time(-240), qualifying: time(-210), race: time(-190), photo: "/banners/2027/belgian-grand-prix.webp", lockedGp: true, sprintQualifying: undefined, sprintRace: undefined, gp: { ...emptyResult(), order: ids.slice(0, 10), pole: ids[0], fastest: ids[1], retirements: ["none"], dotd: ids[0], published: true } };
  const completed = { ...baseline, id: "social-awards", name: "Italian Grand Prix · Awards preview", circuit: "Autodromo Nazionale Monza", practice: time(-120), qualifying: time(-90), race: time(-70), photo: "/banners/2027/italian-grand-prix.webp" };
  const current = { ...baseline, id: "social-current", name: "Singapore Grand Prix · Revealed picks", circuit: "Marina Bay Street Circuit", practice: time(-48), qualifying: time(-3), race: time(24), hasSprint: true, sprintQualifying: time(-28), sprintRace: time(-6), lockedSprint: true, gp: undefined, sprint: undefined, photo: "/banners/2027/singapore-grand-prix-night.webp" };
  const secret = { ...baseline, id: "social-secret", name: "Japanese Grand Prix · Hidden picks", practice: time(130), qualifying: time(160), race: time(184), lockedGp: false, gp: undefined, photo: "/banners/2027/japanese-grand-prix.webp" };
  s.events = [baseline, completed, current, secret];
  s.entries = [];
  s.championPicks = []; s.receipts = [];
  for (const event of s.events) {
    for (const [index, user] of s.users.entries()) {
      const perfect = event.id === baseline.id ? index === 0 : event.id === completed.id ? index === 7 : index === 0;
      const order = ids.slice(0, 10);
      if (!perfect) {
        [order[0], order[1]] = [order[1], order[0]];
        if (index % 2) [order[4], order[5]] = [order[5], order[4]];
        if (index % 3) [order[8], order[9]] = [order[9], order[8]];
      }
      const picks = { order, pole: perfect ? ids[0] : ids[2], fastest: perfect ? ids[1] : ids[3], retirement: perfect ? "none" : ids[7], dotd: perfect ? ids[0] : ids[4] };
      s.entries.push({ userId: user.id, eventId: event.id, kind: "gp", submitted: !(event.id === current.id && index === 6), updatedAt: time(-50), picks });
      if (event.hasSprint) s.entries.push({ userId: user.id, eventId: event.id, kind: "sprint", submitted: index !== 5, updatedAt: time(-30), picks: { ...picks, order: order.slice(0, 8), dotd: "" } });
    }
  }
  s.settings.bannerOverride = current.id;
  s.settings.welcome = "Local preview · weekend prediction grid and weekend awards. All names, schedules and results are simulated.";
  await fs.mkdir(".data", { recursive: true });
  await fs.writeFile(".data/weekend-social-preview.json", JSON.stringify(s));
  console.log("Isolated weekend-social-preview.json ready: revealed GP/Sprint grid, hidden future picks, completed awards and comeback baseline.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
