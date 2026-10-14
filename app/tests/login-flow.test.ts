import { test } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
import { hashPassword } from "../lib/auth";

process.env.DEMO_MODE = "true";
process.env.DEMO_DATA_FILE = `login-flow-test-${process.pid}.json`;
process.env.APP_URL = "http://127.0.0.1:3000";
process.env.SESSION_SECRET =
  "isolated-login-flow-test-secret-at-least-32-characters";

test("login, logout and registration retain branding while enforcing API authentication", async () => {
  const { POST, GET } = await import("../app/api/league/route");
  const { transaction } = await import("../lib/store");
  const post = async (body: Record<string, unknown>, user = "anonymous") => {
    const response = await POST(
      new NextRequest("http://127.0.0.1:3000/api/league", {
        method: "POST",
        headers: {
          origin: process.env.APP_URL!,
          cookie: `apex_demo=${user}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }),
    );
    return { response, data: await response.json() };
  };
  try {
    await transaction((state) => {
      state.users[0].password = hashPassword("local-test-password");
      state.settings.name = "Custom paddock";
      state.settings.loginText = { headline: "Custom headline" };
      state.settings.invite = "private-test-invite";
    });
    const rejected = await post({
      action: "login",
      email: "you@example.invalid",
      password: "incorrect",
    });
    assert.equal(rejected.response.status, 401);
    assert.ok(!("state" in rejected.data));
    const login = await post({
      action: "login",
      email: "you@example.invalid",
      password: "local-test-password",
    });
    assert.equal(login.response.status, 200);
    assert.equal(login.data.authenticated, true);
    assert.equal(login.data.state.settings.name, "Custom paddock");
    assert.ok(
      login.data.state.users.every((user: any) => !("password" in user)),
    );
    assert.match(login.response.headers.get("set-cookie")!, /apex_session=/);
    const logout = await post({ action: "logout" }, "demo-admin");
    assert.equal(logout.data.authenticated, false);
    assert.equal(logout.data.loginText.headline, "Custom headline");
    assert.equal(logout.data.name, "Custom paddock");
    assert.ok(!("state" in logout.data));
    assert.ok(!JSON.stringify(logout.data).includes("private-test-invite"));
    const info = await post({ action: "publicInfo" });
    assert.equal(info.response.status, 200);
    assert.ok(info.data.seasons.length > 0);
    assert.ok(!("state" in info.data));
    const join = await post({
      action: "register",
      name: "New racer",
      email: "new-racer@example.invalid",
      password: "local-registration-password",
      invite: "private-test-invite",
      seasonId: info.data.seasons[0].id,
    });
    assert.equal(join.response.status, 200);
    assert.equal(join.data.authenticated, true);
    const refreshed = await GET(
      new NextRequest("http://127.0.0.1:3000/api/league", {
        headers: { cookie: `apex_demo=${join.data.userId}` },
      }),
    );
    assert.equal((await refreshed.json()).userId, join.data.userId);
  } finally {
    await fs.rm(path.resolve(".data", process.env.DEMO_DATA_FILE!), {
      force: true,
    });
  }
});
