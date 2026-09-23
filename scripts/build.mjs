import { readFile, mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { renderPlayerGuideHtml } from "../src/render.mjs";

const root = resolve(import.meta.dirname, "..");
const paths = {
  html: resolve(root, "src/index.html"), css: resolve(root, "src/style.css"),
  app: resolve(root, "src/app.js"), filter: resolve(root, "src/player-filter.mjs"),
  render: resolve(root, "src/render.mjs"), data: resolve(root, "data/players.json"),
  local: resolve(root, "local-data/cheers.private.json"),
  outputDirectory: resolve(root, "dist"), output: resolve(root, "dist/marines-legends.html")
};

const [htmlSource, css, appSource, filterSource, renderSource, dataSource] = await Promise.all([
  readFile(paths.html, "utf8"), readFile(paths.css, "utf8"), readFile(paths.app, "utf8"),
  readFile(paths.filter, "utf8"), readFile(paths.render, "utf8"), readFile(paths.data, "utf8")
]);
const data = JSON.parse(dataSource);

// Optional private data is keyed by each player's cheers.localContentKey.
// It is merged only into the ignored build artifact; data/players.json is untouched.
if (existsSync(paths.local)) {
  const localContent = JSON.parse(await readFile(paths.local, "utf8"));
  for (const player of data.players) {
    const key = player.cheers?.localContentKey;
    if (key && localContent[key] && typeof localContent[key] === "object") {
      player.cheers = { ...player.cheers, ...localContent[key] };
    }
  }
}

const embeddedJavaScript = [filterSource, renderSource, appSource]
  .map((source) => source.replace(/^import .*;\n/gm, "").replace(/^export /gm, ""))
  .join("\n");
const serializedData = JSON.stringify(data).replaceAll("<", "\\u003c");
const html = htmlSource
  .replace('<link rel="stylesheet" href="./style.css">', `<style>\n${css}\n</style>`)
  .replace('<div id="players" class="player-list" aria-busy="true"><p class="loading-note">選手データを読み込んでいます。</p></div>', `<div id="players" class="player-list" aria-busy="false">${renderPlayerGuideHtml(data.players)}</div>`)
  .replace('<script id="players-data" type="application/json"></script>', `<script id="players-data" type="application/json">${serializedData}</script>`)
  .replace('<script type="module" src="./app.js"></script>', `<script>\n${embeddedJavaScript}\n</script>`);

await mkdir(paths.outputDirectory, { recursive: true });
await writeFile(paths.output, html, "utf8");
console.log(`Built ${paths.output}`);
