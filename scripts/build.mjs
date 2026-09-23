import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { renderPlayerGuideHtml } from "../src/render.mjs";

const root = resolve(import.meta.dirname, "..");
const paths = {
  html: resolve(root, "src/index.html"),
  css: resolve(root, "src/style.css"),
  app: resolve(root, "src/app.js"),
  filter: resolve(root, "src/player-filter.mjs"),
  render: resolve(root, "src/render.mjs"),
  playersDirectory: resolve(root, "data/players"),
  outputDirectory: resolve(root, "dist"),
  output: resolve(root, "dist/marines-legends.html")
};

async function loadPlayers() {
  const filenames = (await readdir(paths.playersDirectory))
    .filter((name) => name.endsWith(".json"))
    .sort();

  const players = await Promise.all(
    filenames.map(async (filename) => {
      const source = await readFile(resolve(paths.playersDirectory, filename), "utf8");
      return JSON.parse(source);
    })
  );

  return players.sort((a, b) => {
    const teamOrder = { WHITE: 0, BLACK: 1 };
    return (teamOrder[a.eventTeam] ?? 99) - (teamOrder[b.eventTeam] ?? 99)
      || Number(a.eventNumber ?? 999) - Number(b.eventNumber ?? 999)
      || String(a.name || "").localeCompare(String(b.name || ""), "ja");
  });
}

const [htmlSource, css, appSource, filterSource, renderSource, players] = await Promise.all([
  readFile(paths.html, "utf8"),
  readFile(paths.css, "utf8"),
  readFile(paths.app, "utf8"),
  readFile(paths.filter, "utf8"),
  readFile(paths.render, "utf8"),
  loadPlayers()
]);

const data = {
  schemaVersion: 2,
  players
};

const embeddedJavaScript = [filterSource, renderSource, appSource]
  .map((source) => source.replace(/^import .*;\n/gm, "").replace(/^export /gm, ""))
  .join("\n");

const serializedData = JSON.stringify(data).replaceAll("<", "\\u003c");
const html = htmlSource
  .replace('<link rel="stylesheet" href="./style.css">', `<style>\n${css}\n</style>`)
  .replace(
    '<div id="players" class="player-list" aria-busy="true"><p class="loading-note">選手データを読み込んでいます。</p></div>',
    `<div id="players" class="player-list" aria-busy="false">${renderPlayerGuideHtml(players)}</div>`
  )
  .replace(
    '<script id="players-data" type="application/json"></script>',
    `<script id="players-data" type="application/json">${serializedData}</script>`
  )
  .replace('<script type="module" src="./app.js"></script>', `<script>\n${embeddedJavaScript}\n</script>`);

await mkdir(paths.outputDirectory, { recursive: true });
await writeFile(paths.output, html, "utf8");
console.log(`Built ${paths.output} with ${players.length} players`);
