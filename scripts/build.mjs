import { readFile, mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const paths = {
  html: resolve(root, "src/index.html"),
  css: resolve(root, "src/style.css"),
  js: resolve(root, "src/app.js"),
  data: resolve(root, "data/players.json"),
  local: resolve(root, "local-data/cheers.private.json"),
  outputDirectory: resolve(root, "dist"),
  output: resolve(root, "dist/marines-legends.html")
};

const [htmlSource, css, js, dataSource] = await Promise.all([
  readFile(paths.html, "utf8"),
  readFile(paths.css, "utf8"),
  readFile(paths.js, "utf8"),
  readFile(paths.data, "utf8")
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

const serializedData = JSON.stringify(data).replaceAll("<", "\\u003c");
const html = htmlSource
  .replace('<link rel="stylesheet" href="./style.css">', `<style>\n${css}\n</style>`)
  .replace('<script id="players-data" type="application/json"></script>', `<script id="players-data" type="application/json">${serializedData}</script>`)
  .replace('<script src="./app.js"></script>', `<script>\n${js}\n</script>`);

await mkdir(paths.outputDirectory, { recursive: true });
await writeFile(paths.output, html, "utf8");
console.log(`Built ${paths.output}`);
