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

function statsGrid(stats) {
  const entries = Object.entries(stats || {}).filter(([key]) => !["status", "note"].includes(key));
  if (!entries.length) return stats?.note ? `<p class="detail-note">${escapeHtml(stats.note)}</p>` : "";
  return `<dl class="stats-grid">${entries.map(([key, value]) => `<div class="stat"><dt>${escapeHtml(statLabels[key] || key)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}</dl>`;
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

function linkList(items) {
  const unique = [...new Map(items.filter((item) => item?.url).map((item) => [item.url, item])).values()];
  if (!unique.length) return "";
  return `<ul class="link-list">${unique.map((item) => `<li><a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.label)}</a></li>`).join("")}</ul>`;
}

function cheerSection(player) {
  if (!player.cheers) return "";

  const variants = (player.cheers.variants || []).map((variant) => {
    const lyrics = String(variant.lyrics || "").trim();
    return `<div class="cheer-variant">
      <div class="cheer-variant__heading">
        <strong>${escapeHtml(variant.name || "応援歌")}</strong>
        ${variant.period ? `<span>${escapeHtml(variant.period)}</span>` : ""}
      </div>
      ${variant.usageNote ? `<p class="cheer-variant__note">${escapeHtml(variant.usageNote)}</p>` : ""}
      ${lyrics ? `<p class="cheer-lyrics">${escapeHtml(lyrics)}</p>` : ""}
    </div>`;
  }).join("");

  return `<section class="detail-section"><h4>応援歌</h4><div class="cheer-box"><p>${escapeHtml(player.cheers.note || "応援歌情報なし")}</p>${variants}${linkList(player.cheers.references || [])}</div></section>`;
}

function sourceSection(player) {
  const items = [];
  if (player.links?.wikipedia) items.push({ label: "Wikipedia", url: player.links.wikipedia });
  items.push(...(player.sources || []).filter((source) => source.url !== player.links?.officialEventPage));
  const links = linkList(items);
  return links ? `<section class="detail-section"><h4>外部リンク・出典</h4>${links}</section>` : "";
}

function playerEntry(player) {
  const searchText = [player.name, player.fullName, player.reading].filter(Boolean).join(" ");
  const imageStyle = player.links?.officialEventImage
    ? ` style="--player-image:url(&quot;${escapeHtml(player.links.officialEventImage)}&quot;)"`
    : "";
  return `<details class="player-entry" data-team="${escapeHtml(player.eventTeam)}" data-position="${escapeHtml(player.position)}" data-search="${escapeHtml(searchText)}">
    <summary class="player-summary">
      <span class="player-summary__body">
        <span class="team-label">TEAM ${escapeHtml(player.eventTeam)}</span>
        <span class="player-name-row"><span class="player-number">${escapeHtml(player.eventNumber)}</span><span><strong>${escapeHtml(player.name)}</strong><small>${escapeHtml(player.position)} / ${escapeHtml(player.throwsBats)}</small></span></span>
        <span class="player-summary__text">${escapeHtml(player.summary)}</span>
        <span class="player-summary__achievement">${escapeHtml(representativeAchievement(player))}</span>
        <span class="summary-toggle"><span class="summary-toggle__open">詳しく見る</span><span class="summary-toggle__close">閉じる</span><span aria-hidden="true">⌄</span></span>
      </span>
      <span class="player-summary__media"${imageStyle}><span aria-hidden="true">${escapeHtml(player.eventNumber)}</span></span>
    </summary>
    <div class="player-detail">
      <dl class="profile-facts">
        <div><dt>読み</dt><dd>${escapeHtml(player.reading)}</dd></div>
        <div><dt>投打</dt><dd>${escapeHtml(player.throwsBats)}</dd></div>
        <div><dt>ロッテ在籍</dt><dd>${escapeHtml(player.marinesTenure)}</dd></div>
        <div><dt>チーム</dt><dd>TEAM ${escapeHtml(player.eventTeam)}</dd></div>
      </dl>
      ${jerseyNumbers(player)}
      <section class="detail-section"><h4>ロッテ在籍時 通算成績</h4>${statsGrid(player.careerStatsMarines)}</section>
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
