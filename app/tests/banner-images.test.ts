import { test } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import {
  imageSlug,
  matchedBanner,
  imageCatalog,
  readBannerImage,
  decorateImages,
} from "../lib/banner-images";
import { seed } from "../lib/seed";
test("Banner matching normalises Grand Prix names and prioritises season-specific images", () => {
  const event = {
    ...seed(true).events[0],
    name: "São Paulo Grand Prix",
    providerCircuitId: "interlagos",
  };
  const assets = [
    { file: "sao-paulo.webp", key: "sao-paulo", url: "generic" },
    {
      file: "2027/São Paulo Grand Prix.png",
      key: "2027/sao-paulo-grand-prix",
      url: "season",
    },
    { file: "interlagos.jpg", key: "interlagos", url: "circuit" },
  ];
  assert.equal(imageSlug("São_Paulo Grand Prix"), "sao-paulo-grand-prix");
  assert.equal(matchedBanner(event, 2027, assets)?.url, "season");
  assert.equal(matchedBanner(event, 2028, assets)?.url, "generic");
  assert.equal(
    matchedBanner({ ...event, name: "Different race" }, 2028, assets)?.url,
    "circuit",
  );
});
test("Folder images decorate responses without replacing manual uploads; image reads reject unsafe paths", async () => {
  const base = path.resolve(".data");
  await fs.mkdir(base, { recursive: true });
  const directory = await fs.mkdtemp(path.join(base, "banner-tests-"));
  const original = process.env.BANNER_IMAGE_DIR;
  process.env.BANNER_IMAGE_DIR = directory;
  const bytes = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN1EAAAAASUVORK5CYII=",
    "base64",
  );
  try {
    await fs.writeFile(path.join(directory, "Singapore Grand Prix.PNG"), bytes);
    await fs.writeFile(path.join(directory, "login.png"), bytes);
    await fs.writeFile(path.join(directory, "login-mobile.png"), bytes);
    await fs.writeFile(path.join(directory, "private.txt"), "secret");
    const assets = await imageCatalog();
    assert.equal(assets.length, 3);
    const state = seed(true),
      event = state.events.find((e) => e.id === "singapore")!;
    event.photo = "";
    const decorated = await decorateImages({
      authenticated: true,
      userId: "demo-admin",
      state: structuredClone(state),
    });
    assert.match(
      decorated.state.events.find((e) => e.id === event.id)!.photo,
      /Singapore%20Grand%20Prix.PNG/,
    );
    assert.equal(state.events.find((e) => e.id === event.id)!.photo, "");
    assert.match((decorated as any).loginImage, /login.png/);
    assert.match((decorated as any).loginMobileImage, /login-mobile.png/);
    event.photo = "data:image/png;base64,manual";
    const manual = await decorateImages({
      authenticated: true,
      userId: "demo-admin",
      state: structuredClone(state),
    });
    assert.equal(
      manual.state.events.find((e) => e.id === event.id)!.photo,
      event.photo,
    );
    assert.deepEqual((await readBannerImage(["login.png"])).bytes, bytes);
    for (const unsafe of [
      ["..", "login.png"],
      ["login.png/other"],
      ["private.txt"],
      ["2027", ".."],
    ])
      await assert.rejects(() => readBannerImage(unsafe));
    assert.deepEqual(await imageCatalog(path.join(directory, "missing")), []);
  } finally {
    if (original === undefined) delete process.env.BANNER_IMAGE_DIR;
    else process.env.BANNER_IMAGE_DIR = original;
    assert.ok(directory.startsWith(base + path.sep));
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test("Bundled 2027 banners work without a mounted VPS folder", async () => {
  const original = process.env.BANNER_IMAGE_DIR;
  process.env.BANNER_IMAGE_DIR = path.resolve(".data", "absent-image-folder");
  try {
    const state = seed(true);
    // Existing seeded artwork must not block automatic photos.
    const response = await decorateImages({ authenticated: true, userId: "demo-admin", state });
    assert.match(response.state.events.find((e) => e.id === "singapore")!.photo, /^\/banners\/2027\/singapore-grand-prix.webp/);
    const assets = await imageCatalog(path.join(process.cwd(), "public", "banners"));
    const event = { ...state.events[0], name: "British Grand Prix" };
    assert.match(matchedBanner(event, 2027, assets)!.file, /british-grand-prix/);
    assert.equal(matchedBanner({ ...event, name: "British Grand Prix" }, 2027, [{ file: "10-great-britain.webp", key: "10-great-britain", url: "numbered" }])?.url, "numbered");
  } finally {
    if (original === undefined) delete process.env.BANNER_IMAGE_DIR;
    else process.env.BANNER_IMAGE_DIR = original;
  }
});
