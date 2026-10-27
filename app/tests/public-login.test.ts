import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import AppEntry from "../components/AppEntry";
import { publicLoginData } from "../lib/public-login";
import { seed } from "../lib/seed";
import { decorateImages } from "../lib/banner-images";

process.env.DEMO_MODE = "true";
process.env.DEMO_DATA_FILE = `public-login-test-${process.pid}.json`;

test("public login allowlist and server HTML preserve branding without league secrets", () => {
  const state = seed(true);
  state.settings.name = "The test paddock";
  state.settings.invite = "private-invite-token";
  state.settings.loginText = {
    headline: "Race with friends",
    welcome: "Welcome racers",
  };
  const data = publicLoginData(state.settings);
  assert.deepEqual(Object.keys(data).sort(), [
    "authenticated",
    "demo",
    "loginText",
    "name",
    "theme",
    "typography",
  ]);
  assert.equal(data.authenticated, false);
  const html = renderToStaticMarkup(
    createElement(AppEntry, {
      initialData: {
        ...data,
        loginImage: "/custom-desktop.webp",
        loginMobileImage: "/custom-mobile.webp",
      },
      hasSession: false,
    }),
  );
  for (const expected of [
    "The test paddock",
    "Race with friends",
    "Welcome racers",
    "Sign in",
    'fetchPriority="high"',
    "/custom-mobile.webp",
    "/custom-desktop.webp",
  ])
    assert.ok(html.includes(expected), expected);
  assert.equal((html.match(/<main\b/g) || []).length, 1);
  for (const privateValue of [
    "private-invite-token",
    "you@example.invalid",
    "Preparing your grid",
    "YOUR PADDOCK",
  ])
    assert.ok(!html.includes(privateValue), privateValue);
  assert.ok(!("state" in data));
  assert.ok(!("userId" in data));
});

test("server public settings read does not create or rewrite league state", async () => {
  const { readPublicSettings } = await import("../lib/store");
  const file = path.resolve(".data", process.env.DEMO_DATA_FILE!);
  await fs.mkdir(path.dirname(file), { recursive: true });
  try {
    const initial = await readPublicSettings();
    assert.equal(initial.name, "Apex League");
    await assert.rejects(fs.stat(file), { code: "ENOENT" });
    const state = seed(true);
    state.settings.name = "Custom server branding";
    state.settings.invite = "hidden-invite";
    const raw = JSON.stringify(state, null, 2);
    await fs.writeFile(file, raw);
    const data = await readPublicSettings();
    assert.equal(data.name, "Custom server branding");
    assert.ok(!JSON.stringify(data).includes("hidden-invite"));
    assert.ok(!JSON.stringify(data).includes("you@example.invalid"));
    assert.equal(await fs.readFile(file, "utf8"), raw);
  } finally {
    await fs.rm(file, { force: true });
  }
});

test("anonymous login image decoration retains custom artwork without returning league data", async () => {
  const original = process.env.BANNER_IMAGE_DIR;
  const directory = await fs.mkdtemp(path.resolve(".data", "public-artwork-"));
  process.env.BANNER_IMAGE_DIR = directory;
  try {
    await fs.writeFile(path.join(directory, "login.webp"), "test-image");
    await fs.writeFile(path.join(directory, "login-mobile.webp"), "test-image");
    const data = await decorateImages(publicLoginData());
    assert.match((data as any).loginImage, /login.webp/);
    assert.match((data as any).loginMobileImage, /login-mobile.webp/);
    assert.ok(!("state" in data));
  } finally {
    if (original === undefined) delete process.env.BANNER_IMAGE_DIR;
    else process.env.BANNER_IMAGE_DIR = original;
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test("invitation URLs render the join form immediately with the supplied code", () => {
  const html = renderToStaticMarkup(
    createElement(AppEntry, {
      initialData: publicLoginData(),
      hasSession: false,
      invitation: "league-invite-123",
    }),
  );
  assert.match(html, /Join your friends/);
  assert.match(html, /value="league-invite-123"/);
  assert.match(html, /Join the grid/);
  assert.match(html, /Already a member\? Sign in/);
  assert.ok(!html.includes("Have an invitation? Join the league"));
  assert.ok(!html.includes("Welcome back"));
});
