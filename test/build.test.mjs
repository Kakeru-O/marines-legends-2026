import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";
import { resolve } from "node:path";
import { matchesPlayer, normalizeSearchText } from "../src/player-filter.mjs";

const root = resolve(import.meta.dirname, "..");
const playersDirectory = resolve(root, "data/players");

async function loadPlayers() {
  const filenames = (await readdir(playersDirectory))
    .filter((name) => name.endsWith(".json"))
    .sort();
  return Promise.all(
    filenames.map((filename) =>
      readFile(resolve(playersDirectory, filename), "utf8").then(JSON.parse)
    )
  );
}

async function build() {
  const before = await Promise.all(
    (await readdir(playersDirectory))
      .filter((name) => name.endsWith(".json"))
      .sort()
      .map(async (name) => [name, await readFile(resolve(playersDirectory, name), "utf8")])
  );

  execFileSync(process.execPath, ["scripts/build.mjs"], { cwd: root });

  const after = await Promise.all(
    before.map(async ([name]) => [name, await readFile(resolve(playersDirectory, name), "utf8")])
  );
  assert.deepEqual(after, before, "build must not modify player JSON files");

  const [output, players] = await Promise.all([
    readFile(resolve(root, "dist/marines-legends.html"), "utf8"),
    loadPlayers()
  ]);
  return { output, players };
}

test("single HTML contains one native accordion per player and no dialog", async () => {
  const { output, players } = await build();
  assert.doesNotMatch(output, /<link rel="stylesheet"/);
  assert.doesNotMatch(output, /<script[^>]+src=/);
  assert.doesNotMatch(output, /<dialog|showModal\(/);
  const renderedHtml = output.replace(/<script[\s\S]*?<\/script>/g, "");
  assert.equal((renderedHtml.match(/<details class="player-entry"/g) || []).length, players.length);
  assert.equal((renderedHtml.match(/<summary class="player-summary"/g) || []).length, players.length);
  players.forEach((player) => assert.match(renderedHtml, new RegExp(player.name)));
});

test("essential player information remains after scripts are removed", async () => {
  const { output, players } = await build();
  const withoutScripts = output.replace(/<script[\s\S]*?<\/script>/g, "");
  for (const player of players) {
    assert.match(withoutScripts, new RegExp(player.name));
    assert.match(withoutScripts, new RegExp(player.reading));
    assert.match(withoutScripts, new RegExp(player.marinesTenure));
  }
  for (const heading of ["背番号履歴", "ロッテ在籍時 通算成績", "シーズン成績", "日本シリーズ", "応援歌", "外部リンク・出典"]) {
    assert.match(withoutScripts, new RegExp(heading));
  }
});

test("filters match team, position, name, and reading", () => {
  const player = { team: "WHITE", position: "投手", search: "架空選手 かくう・せんしゅ" };
  assert.equal(matchesPlayer(player, { team: "WHITE", position: "投手", query: normalizeSearchText("架空") }), true);
  assert.equal(matchesPlayer(player, { team: "WHITE", position: "投手", query: normalizeSearchText("かくう") }), true);
  assert.equal(matchesPlayer(player, { team: "BLACK", position: "投手", query: "" }), false);
  assert.equal(matchesPlayer(player, { team: "WHITE", position: "外野手", query: "" }), false);
});

test("UI source does not hardcode player names or the shared event link", async () => {
  const [appSource, renderSource, players] = await Promise.all([
    readFile(resolve(root, "src/app.js"), "utf8"),
    readFile(resolve(root, "src/render.mjs"), "utf8"),
    loadPlayers()
  ]);
  const source = `${appSource}\n${renderSource}`;
  players.forEach((player) => assert.doesNotMatch(source, new RegExp(player.name)));
  assert.match(renderSource, /source\.url !== player\.links\?\.officialEventPage/);
  assert.doesNotMatch(renderSource, /スペシャルゲーム2026 公式ページ/);
});
