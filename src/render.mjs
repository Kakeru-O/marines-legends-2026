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

function representativeAchievement(player) {
  const years = (player.japanSeries || []).filter((item) => item.champion).map((item) => item.year);
  if (years.length) return `${years.join("・")} 日本シリーズ優勝`;
  if (player.careerStatsMarines?.games !== undefined) return `ロッテ在籍時 ${player.careerStatsMarines.games}試合`;
  return "スペシャルゲーム2026 出場";
}

function statsGrid(stats, { showNote = true } = {}) {
  const entries = Object.entries(stats || {}).filter(([key]) => !["status", "note"].includes(key));
  if (!entries.length) return showNote && stats?.note ? `<p class="detail-note">${escapeHtml(stats.note)}</p>` : "";
  return `<dl class="stats-grid">${entries.map(([key, value]) => `<div class="stat"><dt>${escapeHtml(statLabels[key] || key)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}</dl>${showNote && stats.note ? `<p class="detail-note">${escapeHtml(stats.note)}</p>` : ""}`;
}

function jerseyNumbers(player) {
  const items = (player.jerseyNumbers || []).map((entry) => {
    const period = /\d{4}/.test(entry.period || "") ? `<span>${escapeHtml(entry.period)}</span>` : "";
    return `<li><strong>${escapeHtml(entry.number)}</strong>${period}</li>`;
  }).join("");
  return items ? `<section class="detail-section"><h4>背番号履歴</h4><ul class="number-history">${items}</ul></section>` : "";
}

function seasonStats(player) {
  const seasons = Object.entries(player.seasonStats || {})
    .filter(([, stats]) => stats.status !== "not_in_pro_baseball" || stats.note)
    .map(([year, stats]) => `<div class="season-block"><p class="year-label">${escapeHtml(year)}</p>${statsGrid(stats)}</div>`)
    .join("");
  return seasons ? `<section class="detail-section"><h4>シーズン成績</h4>${seasons}</section>` : "";
}

function japanSeries(player) {
  if (!(player.japanSeries || []).length) return '<p class="detail-note">日本シリーズ出場なし</p>';
  return `<ul class="series-list">${player.japanSeries.map((record) => {
    const result = record.champion ? "優勝" : "出場";
    const highlights = record.highlights?.length ? record.highlights.join(" / ") : "出場記録あり";
    return `<li><strong>${escapeHtml(record.year)}年 日本シリーズ${result}</strong><p>${escapeHtml(highlights)}</p></li>`;
  }).join("")}</ul>`;
}

function safeUrl(value) {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : "";
  } catch { return ""; }
}

function linkList(items) {
  const unique = [...new Map(items.filter((item) => safeUrl(item?.url)).map((item) => [item.url, item])).values()];
  if (!unique.length) return "";
  return `<ul class="link-list">${unique.map((item) => `<li><a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.label)}</a></li>`).join("")}</ul>`;
}

function youtubeEmbedUrl(value) {
  try {
    const url = new URL(value);
    if (!["https:", "http:"].includes(url.protocol)) return "";
    const host = url.hostname.toLowerCase();
    let id;
    if (host === "youtu.be") id = url.pathname.split("/")[1];
    else if (["youtube.com", "www.youtube.com", "m.youtube.com", "youtube-nocookie.com", "www.youtube-nocookie.com"].includes(host)) {
      id = url.pathname === "/watch" ? url.searchParams.get("v") : url.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)/)?.[1];
    }
    if (!/^[a-zA-Z0-9_-]{11}$/.test(id || "")) return "";
    const embed = new URL(`https://www.youtube-nocookie.com/embed/${id}`);
    embed.searchParams.set("playsinline", "1");
    const time = url.searchParams.get("start") || url.searchParams.get("t") || "";
    if (/^\d+$/.test(time)) embed.searchParams.set("start", time);
    else {
      const parts = time.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
      if (parts && time) embed.searchParams.set("start", String(Number(parts[1] || 0) * 3600 + Number(parts[2] || 0) * 60 + Number(parts[3] || 0)));
    }
    return embed.href;
  } catch { return ""; }
}

function cheerSection(player) {
  if (!player.cheers) return "";
  const variants = (player.cheers.variants || []).map((variant) => {
    const lyrics = String(variant.lyrics || "").trim();
    const youtubeUrl = safeUrl(variant.youtubeUrl);
    const embedUrl = youtubeEmbedUrl(youtubeUrl);
    if (!lyrics && !youtubeUrl) return "";
    return `<div class="cheer-variant">
      ${variant.period ? `<div class="cheer-variant__heading"><span>${escapeHtml(variant.period)}</span></div>` : ""}
      ${variant.usageNote ? `<p class="cheer-variant__note">${escapeHtml(variant.usageNote)}</p>` : ""}
      ${lyrics ? `<p class="cheer-lyrics">${escapeHtml(lyrics)}</p>` : ""}
      ${embedUrl ? `<iframe class="cheer-video" src="${escapeHtml(embedUrl)}" title="${escapeHtml(player.name || "選手")}の応援歌動画" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>` : ""}
      ${youtubeUrl ? linkList([{ label: "YouTubeで開く", url: youtubeUrl }]) : ""}
    </div>`;
  }).join("");
  const references = linkList(player.cheers.references || []);
  if (!variants && !references) {
    return player.cheers.type === "player_cheer"
      ? '<section class="detail-section"><h4>応援歌</h4><div class="cheer-box"><p>応援歌・動画は準備中です。</p></div></section>'
      : "";
  }
  return `<section class="detail-section"><h4>応援歌</h4><div class="cheer-box">${player.cheers.note ? `<p>${escapeHtml(player.cheers.note)}</p>` : ""}${variants}${references}</div></section>`;
}

function sourceSection(player) {
  const items = [];
  if (player.links?.wikipedia) items.push({ label: "Wikipedia", url: player.links.wikipedia });
  items.push(...(player.sources || []).filter((source) => source.url !== player.links?.officialEventPage
    && !/\/nipponseries\/boxscore\d{4}_\d+\.html(?:[?#]|$)/.test(source.url)));
  const links = linkList(items);
  return links ? `<details class="detail-section source-disclosure"><summary>外部リンク・出典</summary>${links}</details>` : "";
}

function playerEntry(player) {
  const searchText = [player.name, player.fullName, player.reading].filter(Boolean).join(" ");
  return `<details class="player-entry" data-team="${escapeHtml(player.eventTeam)}" data-position="${escapeHtml(player.position)}" data-search="${escapeHtml(searchText)}">
    <summary class="player-summary">
      <span class="player-summary__body">
        <span class="team-label">TEAM ${escapeHtml(player.eventTeam)}</span>
        <span class="player-name-row"><span class="player-number">${escapeHtml(player.eventNumber)}</span><span><strong>${escapeHtml(player.name)}</strong><small>${escapeHtml(player.position)} / ${escapeHtml(player.throwsBats)}</small></span></span>
        <span class="player-summary__text">${escapeHtml(player.summary)}</span>
        <span class="player-summary__achievement">${escapeHtml(representativeAchievement(player))}</span>
        <span class="summary-toggle"><span class="summary-toggle__open">詳しく見る</span><span class="summary-toggle__close">閉じる</span><span aria-hidden="true">⌄</span></span>
      </span>
      <span class="player-summary__media"><span aria-hidden="true">${escapeHtml(player.eventNumber)}</span></span>
    </summary>
    <div class="player-detail">
      <dl class="profile-facts">
        <div><dt>読み</dt><dd>${escapeHtml(player.reading)}</dd></div>
        <div><dt>投打</dt><dd>${escapeHtml(player.throwsBats)}</dd></div>
        <div><dt>ロッテ在籍</dt><dd>${escapeHtml(player.marinesTenure)}</dd></div>
        <div><dt>チーム</dt><dd>TEAM ${escapeHtml(player.eventTeam)}</dd></div>
      </dl>
      ${jerseyNumbers(player)}
      <section class="detail-section"><h4>ロッテ在籍時 通算成績</h4>${statsGrid(player.careerStatsMarines, { showNote: false })}</section>
      ${seasonStats(player)}
      <section class="detail-section"><h4>日本シリーズ</h4>${japanSeries(player)}</section>
      ${cheerSection(player)}
      ${sourceSection(player)}
    </div>
  </details>`;
}

export function renderPlayerGuideHtml(players) {
  return players.map(playerEntry).join("\n");
}
