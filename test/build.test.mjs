import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

test("single-file build embeds styles, scripts, and every player", async () => {
  execFileSync(process.execPath, ["scripts/build.mjs"], { cwd: root });
  const [output, sourceData] = await Promise.all([
    readFile(resolve(root, "dist/marines-legends.html"), "utf8"),
    readFile(resolve(root, "data/players.json"), "utf8").then(JSON.parse)
  ]);

  assert.doesNotMatch(output, /<link rel="stylesheet"/);
  assert.doesNotMatch(output, /<script src=/);
  assert.match(output, /<style>/);
  assert.match(output, /id="players-data"/);
  sourceData.players.forEach((player) => assert.match(output, new RegExp(player.name)));
});

test("UI source does not hardcode player names", async () => {
  const [appSource, sourceData] = await Promise.all([
    readFile(resolve(root, "src/app.js"), "utf8"),
    readFile(resolve(root, "data/players.json"), "utf8").then(JSON.parse)
  ]);
  sourceData.players.forEach((player) => assert.doesNotMatch(appSource, new RegExp(player.name)));
});

test("player details suppress the shared event page and provisional jersey periods", async () => {
  const appSource = await readFile(resolve(root, "src/app.js"), "utf8");
  assert.match(appSource, /source\.url !== player\.links\?\.officialEventPage/);
  assert.match(appSource, /\\d\{4\}/);
  assert.doesNotMatch(appSource, /スペシャルゲーム2026 公式ページ/);
});
