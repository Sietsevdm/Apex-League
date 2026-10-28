import { test } from "node:test";
import assert from "node:assert/strict";
import { shareMetadata } from "../lib/share-metadata";

test("share previews resolve from runtime APP_URL without exposing invitation or league data", () => {
  const original = process.env.APP_URL;
  try {
    process.env.APP_URL = "https://first.example";
    const first = shareMetadata();
    process.env.APP_URL = "https://second.example";
    const second = shareMetadata();
    assert.equal(new URL(first.metadataBase!).origin, "https://first.example");
    assert.equal(new URL(second.metadataBase!).origin, "https://second.example");
    assert.equal(new URL("/apex-share-preview.png", second.metadataBase!).href, "https://second.example/apex-share-preview.png");
    assert.ok(second.openGraph && "type" in second.openGraph);
    assert.equal(second.openGraph.type, "website");
    assert.ok(second.twitter && "card" in second.twitter);
    assert.equal(second.twitter.card, "summary_large_image");
    assert.match(String(second.description), /Friends in the Paddock/);
    assert.ok(!JSON.stringify(second).includes("invite="));
  } finally {
    if (original === undefined) delete process.env.APP_URL;
    else process.env.APP_URL = original;
  }
});
