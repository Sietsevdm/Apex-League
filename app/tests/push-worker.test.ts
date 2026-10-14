import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
test("push worker displays a fallback for malformed messages and opens only the league", async () => {
  const handlers: Record<string, (event: any) => void> = {};
  const shown: any[] = [];
  let opened = "";
  const self = {
    addEventListener: (name: string, handler: any) => {
      handlers[name] = handler;
    },
    registration: {
      showNotification: (...args: any[]) => {
        shown.push(args);
        return Promise.resolve();
      },
    },
    clients: {
      matchAll: async () => [],
      openWindow: async (url: string) => {
        opened = url;
      },
    },
    location: { origin: "https://league.example.com" },
  };
  vm.runInNewContext(await readFile("public/sw.js", "utf8"), { self, URL });
  let finished: Promise<unknown> = Promise.resolve();
  handlers.push({
    data: {
      json: () => ({
        title: "Deadline",
        body: "Submit your prediction",
        url: "https://evil.test",
      }),
    },
    waitUntil: (p: Promise<unknown>) => {
      finished = p;
    },
  });
  await finished;
  assert.equal(shown[0][0], "Deadline");
  assert.equal(shown[0][1].data.url, "/");
  handlers.push({
    data: {
      json: () => {
        throw new Error("bad JSON");
      },
    },
    waitUntil: (p: Promise<unknown>) => {
      finished = p;
    },
  });
  await finished;
  assert.equal(shown[1][0], "Apex League");
  let closed = false;
  handlers.notificationclick({
    notification: {
      close: () => {
        closed = true;
      },
    },
    waitUntil: (p: Promise<unknown>) => {
      finished = p;
    },
  });
  await finished;
  assert.equal(opened, "/");
  assert.equal(closed, true);
});
