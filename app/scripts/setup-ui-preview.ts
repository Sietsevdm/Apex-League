import { seed } from "../lib/seed";
import { hashPassword } from "../lib/auth";
import { promises as fs } from "node:fs";

async function main() {
  const state = seed(true);
  state.users[0].password = hashPassword("apex-local-preview");
  const now = Date.now();
  const time = (hours: number) => new Date(now + hours * 3600000).toISOString();
  const e = state.events.find(e => e.id === "singapore")!;
  e.practice = time(-12); e.qualifying = time(26); e.race = time(50);
  e.sprintQualifying = time(4); e.sprintRace = time(23);
  e.gpDeadline = time(25); e.sprintDeadline = time(3);
  e.practice2 = time(20); e.practice3 = time(24);
  e.photo = "/banners/2027/singapore-grand-prix-night.webp";
  const ids = state.seasons[0].drivers.map(d => d.id);
  const picks = { order: ids.slice(0, 10), pole: ids[0], fastest: ids[1], retirement: "none", dotd: ids[2] };
  state.entries.push({ userId: "demo-admin", eventId: e.id, kind: "gp", submitted: true, updatedAt: time(-1), picks });
  state.entries.push({ userId: "demo-admin", eventId: e.id, kind: "sprint", submitted: false, updatedAt: time(-1), picks: { ...picks, order: [ids[0], ids[1], "", "", "", "", "", ""], pole: "", fastest: "", retirement: "" } });
  state.seasons.unshift({ ...state.seasons[0], id: "empty-preview", name: "Preview · Empty calendar", year: 2026 });
  state.users.forEach(user => user.seasonIds.push("empty-preview"));
  state.settings.welcome = "Your next race, your saved picks and everything you need for the weekend.";
  await fs.mkdir(".data", { recursive: true });
  await fs.writeFile(".data/ui-cohesion-preview.json", JSON.stringify(state));
  console.log("Created isolated preview: submitted GP, draft Sprint, completed races and an empty-calendar season.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
