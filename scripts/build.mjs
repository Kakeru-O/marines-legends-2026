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

const statLabels = {
  games: "試合", plateAppearances: "打席", atBats: "打数", hits: "安打",
  homeRuns: "本塁打", rbi: "打点", stolenBases: "盗塁",
  battingAverage: "打率", onBasePercentage: "出塁率", sluggingPercentage: "長打率",
  wins: "勝利", losses: "敗戦", saves: "セーブ", holds: "ホールド",
  completeGames: "完投", shutouts: "完封", innings: "投球回", strikeouts: "奪三振", era: "防御率"
};

const escapeHtml = (value) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#39;");

function achievement(player) {
  const years = (player.japanSeries || []).filter((item) => item.champion).map((item) => item.year);
  if (years.length) return `${years.join("・")} 日本シリーズ優勝`;
  if (player.careerStatsMarines?.games !== undefined) return `ロッテ在籍時 ${player.careerStatsMarines.games}試合`;
  return "スペシャルゲーム2026 出場";
}

function staticStats(stats) {
  const entries = Object.entries(stats || {}).filter(([key]) => !["status", "note"].includes(key));
  if (!entries.length) return stats?.note ? `<p class="stat-note">${escapeHtml(stats.note)}</p>` : "";
  return `<dl class="stats-grid">${entries.map(([key, value]) => `<div class="stat"><dt>${escapeHtml(statLabels[key] || key)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}</dl>`;
}

function staticLinks(player) {
  const items = [];
  if (player.links?.wikipedia) items.push({ label: "Wikipedia", url: player.links.wikipedia });
  items.push(...(player.sources || []).filter((source) => source.url !== player.links?.officialEventPage));
  items.push(...(player.cheers?.references || []));
  return `<ul class="link-list">${items.map((item) => `<li><a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.label)}</a></li>`).join("")}</ul>`;
}

function staticCard(player) {
  const image = player.links?.officialEventImage
    ? `<img class="player-card__image" src="${escapeHtml(player.links.officialEventImage)}" alt="${escapeHtml(player.name)}のイベント公式写真" loading="lazy">`
    : "";
  return `<article class="player-card">
    <div class="player-card__media"><span class="player-card__fallback" aria-hidden="true">${escapeHtml(player.eventNumber)}</span>${image}</div>
    <span class="player-card__team">TEAM ${escapeHtml(player.eventTeam)}</span>
    <div class="player-card__content"><div class="player-card__identity"><span class="player-card__number">${escapeHtml(player.eventNumber)}</span><div><h3>${escapeHtml(player.name)}</h3><p class="player-card__position">${escapeHtml(player.position)} / ${escapeHtml(player.throwsBats)}</p></div></div><p class="player-card__summary">${escapeHtml(player.summary)}</p><p class="player-card__achievement">${escapeHtml(achievement(player))}</p></div>
    <a class="card-button" href="#static-${escapeHtml(player.id)}"><span>${escapeHtml(player.name)}の詳細を見る</span></a>
  </article>`;
}

function staticDetail(player) {
  const numberHistory = (player.jerseyNumbers || []).map((entry) => {
    const period = /\d{4}/.test(entry.period || "") ? ` ${escapeHtml(entry.period)}` : "";
    return `<li><strong>${escapeHtml(entry.number)}</strong>${period}</li>`;
  }).join("");
  const seasons = Object.entries(player.seasonStats || {}).filter(([, stats]) => stats.status !== "not_in_pro_baseball" || stats.note).map(([year, stats]) => `<div class="year-block"><p class="year-label">${escapeHtml(year)}</p>${staticStats(stats)}</div>`).join("");
  const japanSeries = (player.japanSeries || []).length
    ? `<ul class="series-list">${player.japanSeries.map((record) => `<li class="series-item"><strong>${escapeHtml(record.year)}年 日本シリーズ${record.champion ? "優勝" : "出場"}</strong><p>${escapeHtml(record.highlights?.length ? record.highlights.join(" / ") : "出場記録あり")}</p></li>`).join("")}</ul>`
    : '<p class="stat-note">日本シリーズ出場なし</p>';
  return `<article id="static-${escapeHtml(player.id)}" class="static-player">
    <header class="static-player__header"><span class="static-player__number">${escapeHtml(player.eventNumber)}</span><div><h3>${escapeHtml(player.name)}</h3><p class="static-player__meta">${escapeHtml(player.reading)} / ${escapeHtml(player.position)} / ${escapeHtml(player.throwsBats)}</p></div></header>
    <p class="static-player__summary">${escapeHtml(player.summary)}</p>
    <dl class="profile-facts"><div><dt>ロッテ在籍</dt><dd>${escapeHtml(player.marinesTenure)}</dd></div><div><dt>イベント</dt><dd>TEAM ${escapeHtml(player.eventTeam)}</dd></div></dl>
    ${numberHistory ? `<h4>背番号履歴</h4><ul class="number-history">${numberHistory}</ul>` : ""}
    <h4>ロッテ在籍時 通算成績</h4>${staticStats(player.careerStatsMarines)}
    ${seasons ? `<h4>シーズン成績</h4>${seasons}` : ""}
    <h4>日本シリーズ</h4>${japanSeries}
    ${player.cheers ? `<h4>応援歌</h4><div class="cheer-box"><p>${escapeHtml(player.cheers.note || "応援歌情報なし")}</p></div>` : ""}
    <h4>外部リンク・出典</h4>${staticLinks(player)}
    <a class="static-player__back" href="#players">↑ 選手一覧へ戻る</a>
  </article>`;
}

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
const staticContent = `${data.players.map(staticCard).join("\n")}\n</div><section class="static-details" aria-label="選手詳細"><p class="static-notice">検索・絞り込みを使えないプレビュー表示です。各選手の情報は以下で確認できます。</p>${data.players.map(staticDetail).join("\n")}</section>`;
const html = htmlSource
  .replace('<link rel="stylesheet" href="./style.css">', `<style>\n${css}\n</style>`)
  .replace('<div id="players" class="player-grid" aria-busy="true"></div>', `<div id="players" class="player-grid" aria-busy="true">${staticContent}`)
  .replace('<script id="players-data" type="application/json"></script>', `<script id="players-data" type="application/json">${serializedData}</script>`)
  .replace('<script src="./app.js"></script>', `<script>\n${js}\n</script>`);

await mkdir(paths.outputDirectory, { recursive: true });
await writeFile(paths.output, html, "utf8");
console.log(`Built ${paths.output}`);
