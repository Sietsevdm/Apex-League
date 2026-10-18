import { promises as fs, constants } from "node:fs";
import path from "node:path";
import type { Event, State } from "./model";
type Asset = { file: string; key: string; url: string };
export const imageDirectory = () =>
  process.env.BANNER_IMAGE_DIR || path.join(process.cwd(), ".data", "images");
export function imageSlug(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
const extensions = ["webp", "jpg", "jpeg", "png"];
export async function imageCatalog(
  directory = imageDirectory(),
): Promise<Asset[]> {
  const assets: Asset[] = [];
  async function scan(folder: string) {
    const base = path.join(/*turbopackIgnore: true*/ directory, folder);
    const entries = await fs.readdir(/*turbopackIgnore: true*/ base, {
      withFileTypes: true,
    });
    for (const entry of entries.slice(0, 2048)) {
      if (entry.isDirectory() && !folder && /^\d{4}$/.test(entry.name)) {
        await scan(entry.name);
        continue;
      }
      if (!entry.isFile() || !/\.(webp|jpe?g|png)$/i.test(entry.name)) continue;
      const file = folder ? `${folder}/${entry.name}` : entry.name;
      const stat = await fs.stat(
        /*turbopackIgnore: true*/ path.join(/*turbopackIgnore: true*/ base, entry.name),
      );
      if (stat.size > 20_000_000) continue;
      assets.push({
        file,
        key: `${folder ? folder + "/" : ""}${imageSlug(entry.name.replace(/\.[^.]+$/, ""))}`,
        url: `/api/images/${file.split("/").map(encodeURIComponent).join("/")}?v=${stat.mtimeMs}-${stat.size}`,
      });
    }
  }
  try {
    await scan("");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT")
      console.error("Banner image folder is unavailable.");
  }
  return assets.sort(
    (a, b) =>
      extensions.indexOf(path.extname(a.file).slice(1).toLowerCase()) -
        extensions.indexOf(path.extname(b.file).slice(1).toLowerCase()) ||
      a.file.localeCompare(b.file),
  );
}
export function matchedBanner(event: Event, year: number, assets: Asset[]) {
  const name = imageSlug(event.name);
  const aliases: Record<string, string[]> = {
    british: ["great-britain", "britain"], australian: ["australia"],
    austrian: ["austria"], belgian: ["belgium"], brazilian: ["brazil", "sao-paulo"],
    chinese: ["china"], dutch: ["netherlands"], hungarian: ["hungary"],
    italian: ["italy"], japanese: ["japan"], mexican: ["mexico", "mexico-city"],
    portuguese: ["portugal"], spanish: ["spain"], turkish: ["turkiye"],
    "saudi-arabian": ["saudi-arabia"], canadian: ["canada"],
  };
  const short = name.replace(/-(grand-prix|gp)$/, "");
  const circuitBanners: Record<string, string> = {
    bahrain: "bahrain", jeddah: "saudi-arabian", albert_park: "australian",
    shanghai: "chinese", suzuka: "japanese", miami: "miami", villeneuve: "canadian",
    monaco: "monaco", madring: "spanish", silverstone: "british", spa: "belgian",
    hungaroring: "hungarian", monza: "italian", marina_bay: "singapore", red_bull_ring: "austrian",
    baku: "azerbaijan", americas: "united-states", rodriguez: "mexican",
    interlagos: "sao-paulo", vegas: "las-vegas", las_vegas: "las-vegas",
    losail: "qatar", yas_marina: "abu-dhabi", istanbul: "turkish", portimao: "portuguese",
  };
  const circuitNames: Record<string, string> = {
    "bahrain-international-circuit": "bahrain", "jeddah-corniche-circuit": "saudi-arabian",
    "albert-park-grand-prix-circuit": "australian", "albert-park-circuit": "australian",
    "shanghai-international-circuit": "chinese", "suzuka-circuit": "japanese",
    "suzuka-international-racing-course": "japanese", "silverstone-circuit": "british",
    "circuit-gilles-villeneuve": "canadian", "circuit-de-monaco": "monaco",
    "circuit-de-spa-francorchamps": "belgian", "hungaroring": "hungarian", "red-bull-ring": "austrian",
    "autodromo-nazionale-di-monza": "italian", "marina-bay-street-circuit": "singapore",
    "baku-city-circuit": "azerbaijan", "circuit-of-the-americas": "united-states",
    "autodromo-hermanos-rodriguez": "mexican", "autodromo-jose-carlos-pace": "sao-paulo",
    "interlagos": "sao-paulo", "las-vegas-strip-circuit": "las-vegas",
    "lusail-international-circuit": "qatar", "losail-international-circuit": "qatar",
    "yas-marina-circuit": "abu-dhabi", "istanbul-park": "turkish",
    "autodromo-internacional-do-algarve": "portuguese",
  };
  const circuitRace = circuitBanners[event.providerCircuitId || ""] || circuitNames[imageSlug(event.circuit)];
  const keys = [
    ...new Set(
      [
        name,
        short,
        ...(aliases[short] || []).flatMap((key) => [key, `${key}-grand-prix`]),
        imageSlug(event.providerCircuitId || ""),
        imageSlug(event.circuit),
        ...(circuitRace ? [circuitRace, `${circuitRace}-grand-prix`] : []),
      ].filter(Boolean),
    ),
  ];
  for (const prefix of [`${year}/`, ""])
    for (const key of keys) {
      const asset = assets.find((a) => {
        const slash = a.key.lastIndexOf("/");
        const normalized = a.key.slice(0, slash + 1) + a.key.slice(slash + 1).replace(/^\d{2}-/, "");
        return normalized === prefix + key;
      });
      if (asset) return asset;
    }
}
export function matchedWeatherBanner(event: Event, year: number, condition: "sunny" | "cloudy" | "rainy" | "night", assets: Asset[]) {
  const suffix = `-${condition}`;
  return matchedBanner(event, year, assets.filter(asset => asset.key.endsWith(suffix))
    .map(asset => ({ ...asset, key: asset.key.slice(0, -suffix.length) })));
}
export function hasManualBanner(event: Event) {
  return Boolean(event.photo && !["/circuit-night.svg", "/circuit-day.svg"].includes(event.photo) && !event.photo.startsWith("/api/images/") && !event.photo.startsWith("/banners/"));
}
export async function weatherBannerPhoto(event: Event, year: number, condition: "sunny" | "cloudy" | "rainy" | "night") {
  if (hasManualBanner(event)) return null;
  const custom = await imageCatalog();
  const override = matchedWeatherBanner(event, year, condition, custom);
  // An organiser's custom base image must not switch to unrelated packaged scenery.
  if (override || matchedBanner(event, year, custom)) return override?.url || null;
  const bundled = (await imageCatalog(path.join(process.cwd(), "public", "banners")))
    .map(asset => ({ ...asset, url: asset.url.replace("/api/images/", "/banners/") }));
  return (matchedWeatherBanner(event, year, condition, bundled) || matchedWeatherBanner(event, year, condition,
    bundled.map(asset => ({ ...asset, key: asset.key.replace(/^\d{4}\//, "") }))))?.url || null;
}
export async function decorateImages<T>(data: T): Promise<T> {
  const response = data as any;
  if (!("authenticated" in response)) return data;
  const custom = await imageCatalog();
  response.loginImage = custom.find((a) => a.key === "login")?.url || "/login-race.svg";
  response.loginMobileImage = custom.find((a) => a.key === "login-mobile")?.url || response.loginImage;
  if (!response.state) return data;
  const bundled = (await imageCatalog(path.join(process.cwd(), "public", "banners")))
    .map((asset) => ({ ...asset, url: asset.url.replace("/api/images/", "/banners/") }));
  // Packaged photographs are reusable circuit assets; custom year folders remain year-specific.
  const sharedBundled = bundled.map((asset) => ({ ...asset, key: asset.key.replace(/^\d{4}\//, "") }));
  const s = response.state as State | undefined;
  if (s) {
    const matches = s.events.map((event) => {
      const year = s.seasons.find((x) => x.id === event.seasonId)?.year || 0;
      const asset = matchedBanner(event, year, custom) || matchedBanner(event, year, bundled) || matchedBanner(event, year, sharedBundled);
      const saved = s.settings.savedBannerPhotos?.find((photo) => photo.year === year && imageSlug(photo.name) === imageSlug(event.name) && imageSlug(photo.circuit) === imageSlug(event.circuit));
      if ((!event.photo || ["/circuit-night.svg", "/circuit-day.svg"].includes(event.photo)) && saved) { event.photo = saved.photo; event.focal = saved.focal; event.credit = saved.credit; }
      const manual = Boolean(event.photo && !["/circuit-night.svg", "/circuit-day.svg"].includes(event.photo) && !event.photo.startsWith("/api/images/") && !event.photo.startsWith("/banners/"));
      if (!manual) event.photo = asset?.url || "";
      return {
        eventId: event.id,
        name: event.name,
        expected: `${imageSlug(event.name)}.webp`,
        file: asset?.file || "",
        source: manual
          ? "Manual upload"
          : asset
            ? asset.url.startsWith("/banners/") ? "Included banner" : "Image folder"
            : "Default illustration",
      };
    });
    if (s.users.find((u) => u.id === response.userId)?.role === "admin")
      (s as any).imageMatches = matches;
  }
  return data;
}
export async function readBannerImage(
  segments: string[],
  directory = imageDirectory(),
) {
  if (
    segments.length < 1 ||
    segments.length > 2 ||
    segments.some(
      (s) => !s || s === "." || s === ".." || /[\\/\x00]/.test(s),
    ) ||
    (segments.length === 2 && !/^\d{4}$/.test(segments[0]))
  )
    throw new Error("Invalid image path");
  const ext = path.extname(segments.at(-1)!).slice(1).toLowerCase();
  if (!extensions.includes(ext)) throw new Error("Unsupported image");
  const root = await fs.realpath(/*turbopackIgnore: true*/ directory);
  const target = await fs.realpath(
    /*turbopackIgnore: true*/ path.join(root, ...segments),
  );
  if (!target.startsWith(root + path.sep))
    throw new Error("Invalid image path");
  const handle = await fs.open(
    /*turbopackIgnore: true*/ target,
    constants.O_RDONLY | (constants.O_NOFOLLOW || 0),
  );
  try {
    const stat = await handle.stat();
    if (!stat.isFile() || stat.size > 20_000_000)
      throw new Error("Invalid image");
    return {
      bytes: await handle.readFile(),
      etag: `"${stat.mtimeMs}-${stat.size}"`,
      type: ext === "jpg" || ext === "jpeg" ? "image/jpeg" : `image/${ext}`,
    };
  } finally {
    await handle.close();
  }
}
