import { version } from "../package.json";
export function newerVersion(candidate: string, current = version) {
  if (!/^\d+\.\d+\.\d+$/.test(candidate)) return false;
  const a = candidate.split(".").map(Number), b = current.split(".").map(Number);
  for (let i = 0; i < 3; i++) { if (a[i] !== b[i]) return a[i] > b[i]; }
  return false;
}
export async function checkUpdates(fetcher: typeof fetch = fetch) {
  const repository = process.env.UPDATES_REPOSITORY?.trim();
  if (!repository) return { current: version, status: "unconfigured" };
  if (!/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(repository)) throw new Error("Use owner/repository for UPDATES_REPOSITORY.");
  const response = await fetcher(`https://api.github.com/repos/${repository}/releases/latest`, {
    headers: { Accept: "application/vnd.github+json", "User-Agent": "Apex-League-Update-Check" },
    cache: "no-store", signal: AbortSignal.timeout(8000),
  });
  if (response.status === 404) return { current: version, status: "unavailable" };
  if (!response.ok) throw new Error("Could not check releases. Try again later.");
  const release = await response.json();
  const latest = String(release.tag_name || "").replace(/^v/, "");
  if (release.draft || release.prerelease || !/^\d+\.\d+\.\d+$/.test(latest)) throw new Error("No valid stable release was found.");
  return { current: version, latest, status: newerVersion(latest) ? "available" : "current",
    url: `https://github.com/${repository}/releases/tag/v${latest}`,
    notes: String(release.body || "").slice(0, 12000), image: `ghcr.io/${repository.toLowerCase()}:${latest}` };
}
