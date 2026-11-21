import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";
import { resolve } from "node:path";
import { loadPlayers as loadManifestPlayers, validateRoster } from "../scripts/load-players.mjs";
import { renderPlayerGuideHtml } from "../src/render.mjs";
import { matchesPlayer, normalizeSearchText } from "../src/player-filter.mjs";

const root = resolve(import.meta.dirname, "..");
const playersDirectory = resolve(root, "data/players");

async function loadPlayers() {
  return loadManifestPlayers(root);
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

test("Pages entry is identical to the offline HTML and embeds no third-party image", async () => {
  const { output } = await build();
  assert.equal(await readFile(resolve(root, "dist/index.html"), "utf8"), output);
  const markup = output.replace(/<script[\s\S]*?<\/script>/g, "");
  assert.doesNotMatch(markup, /<img\b|--player-image|background-image/);
});

test("manifest loads all 44 players in official order and preserves 00", async () => {
  const manifest = JSON.parse(await readFile(resolve(root, "data/players_list.json"), "utf8"));
  const players = await loadPlayers();
  assert.equal(players.length, 44);
  assert.equal(players.filter(p => p.eventTeam === "WHITE").length, 21);
  assert.equal(players.filter(p => p.eventTeam === "BLACK").length, 23);
  assert.deepEqual(players.map(p => p.id), [...manifest.players].sort((a,b) => a.order-b.order).map(p => p.id));
  assert.equal(players.find(p => p.name === "高濱卓也").eventNumber, "00");
  for (const player of players) {
    for (const variant of player.cheers?.variants || []) assert.equal(variant.lyrics, "");
    for (const source of player.sources) assert.match(source.url, /^https?:\/\//);
  }
});

test("manifest rejects missing, unlisted, duplicate and inconsistent data", () => {
  const entry = { id: "example", file: "example.json", eventTeam: "WHITE", eventNumber: 0, position: "投手", order: 1 };
  const profile = { id: "example", name: "テスト", reading: "てすと", throwsBats: "右投右打", marinesTenure: "2000–2001", summary: "テスト用", sources: [{ label: "source", url: "https://example.com" }], jerseyNumbers: [{ number: 0 }], careerStatsMarines: { games: 1 } };
  const manifest = { schemaVersion: 1, players: [entry] };
  const files = new Map([[entry.file, profile]]);
  assert.equal(validateRoster(manifest, files).length, 1);
  assert.throws(() => validateRoster(manifest, new Map()), /Missing player/);
  assert.throws(() => validateRoster(manifest, new Map([...files, ["extra.json", profile]])), /Unlisted/);
  assert.throws(() => validateRoster({ ...manifest, players: [entry, entry] }, files), /Duplicate id/);
  assert.throws(() => validateRoster(manifest, new Map([[entry.file, { ...profile, id: "other" }]])), /ID mismatch/);
  for (const [field, value] of [["eventTeam", "OTHER"], ["position", "野手"], ["eventNumber", ""]]) {
    assert.throws(() => validateRoster({ ...manifest, players: [{ ...entry, [field]: value }] }, files), /Invalid event metadata/);
  }
  assert.throws(() => validateRoster(manifest, new Map([[entry.file, { ...profile, eventTeam: "BLACK" }]])), /eventTeam mismatch/);
  assert.throws(() => validateRoster(manifest, new Map([[entry.file, { ...profile, name: "" }]])), /Missing name/);
  assert.throws(() => validateRoster({ ...manifest, players: [{ ...entry, file: "../example.json" }] }, files), /Invalid\/duplicate file/);
  const second = { ...entry, id: "second", file: "second.json" };
  assert.throws(() => validateRoster({ ...manifest, players: [entry, second] }, new Map([...files, [second.file, { ...profile, id: second.id }]])), /Invalid\/duplicate order/);
});

test("empty cheer fields disappear and populated YouTube or lyrics render safely", () => {
  const player = { cheers: { variants: [{ name: "空の応援歌", lyrics: "", youtubeUrl: "" }] } };
  const empty = renderPlayerGuideHtml([player]);
  assert.doesNotMatch(empty, /<h4>応援歌|cheer-lyrics|cheer-variant|youtube/);
  player.cheers.variants[0].youtubeUrl = "https://www.youtube.com/watch?v=example";
  assert.match(renderPlayerGuideHtml([player]), /href="https:\/\/www.youtube.com\/watch\?v=example"/);
  assert.doesNotMatch(renderPlayerGuideHtml([player]), /cheer-lyrics/);
  player.cheers.variants[0] = { lyrics: "<script>テスト</script>\n次の行", youtubeUrl: "javascript:alert(1)" };
  const populated = renderPlayerGuideHtml([player]);
  assert.match(populated, /&lt;script&gt;テスト&lt;\/script&gt;/);
  assert.doesNotMatch(populated, /javascript:|<script>/);
});

test("real roster filters combine TEAM, all four positions, name and reading", async () => {
  const players = await loadPlayers();
  const filter = (team, position, query = "") => players.filter(p => matchesPlayer({ team: p.eventTeam, position: p.position, search: `${p.name} ${p.reading}` }, { team, position, query: normalizeSearchText(query) }));
  assert.equal(filter("WHITE", "すべて").length, 21);
  assert.equal(filter("BLACK", "すべて").length, 23);
  for (const team of ["WHITE", "BLACK"]) {
    for (const position of ["投手", "捕手", "内野手", "外野手"]) assert.ok(filter(team, position).length);
  }
  const player = players[0];
  assert.equal(filter(player.eventTeam, player.position, player.name)[0].id, player.id);
  assert.equal(filter(player.eventTeam, player.position, player.reading)[0].id, player.id);
  assert.equal(filter("ALL", "すべて", "該当しない選手").length, 0);
});
