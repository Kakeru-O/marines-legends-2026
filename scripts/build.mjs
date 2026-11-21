import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { loadPlayers } from "./load-players.mjs";
import { renderPlayerGuideHtml } from "../src/render.mjs";

const root = resolve(import.meta.dirname, "..");
const paths = {
  html: resolve(root, "src/index.html"),
  css: resolve(root, "src/style.css"),
  app: resolve(root, "src/app.js"),
  filter: resolve(root, "src/player-filter.mjs"),
  render: resolve(root, "src/render.mjs"),
  outputDirectory: resolve(root, "dist"),
  output: resolve(root, "dist/marines-legends.html")
};

const [htmlSource, css, appSource, filterSource, renderSource, players] = await Promise.all([
  readFile(paths.html, "utf8"),
  readFile(paths.css, "utf8"),
  readFile(paths.app, "utf8"),
  readFile(paths.filter, "utf8"),
  readFile(paths.render, "utf8"),
  loadPlayers(root)
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
await Promise.all([
  writeFile(paths.output, html, "utf8"),
  writeFile(resolve(paths.outputDirectory, "index.html"), html, "utf8")
]);
console.log(`Built ${paths.output} with ${players.length} players`);
