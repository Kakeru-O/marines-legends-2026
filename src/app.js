(() => {
  "use strict";

  const statLabels = {
    games: "試合", plateAppearances: "打席", atBats: "打数", hits: "安打",
    homeRuns: "本塁打", rbi: "打点", stolenBases: "盗塁",
    battingAverage: "打率", onBasePercentage: "出塁率", sluggingPercentage: "長打率",
    wins: "勝利", losses: "敗戦", saves: "セーブ", holds: "ホールド",
    completeGames: "完投", shutouts: "完封", innings: "投球回", strikeouts: "奪三振", era: "防御率"
  };
  const hiddenStatKeys = new Set(["status", "note"]);
  const state = { players: [], team: "ALL", position: "すべて", query: "" };

  const $ = (selector, root = document) => root.querySelector(selector);
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const normalize = (value) => String(value || "").normalize("NFKC").toLocaleLowerCase("ja").replace(/[\s・]/g, "");

  async function loadData() {
    const embedded = $("#players-data").textContent.trim();
    if (embedded) return JSON.parse(embedded);
    const response = await fetch("../data/players.json");
    if (!response.ok) throw new Error(`選手データを取得できませんでした (${response.status})`);
    return response.json();
  }

  function button(label, attrs = {}) {
    const node = el("button", "filter-button", label);
    node.type = "button";
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
    return node;
  }

  function setupFilters() {
    const positions = ["すべて", ...new Set(state.players.map((player) => player.position).filter(Boolean))];
    const container = $("#position-filters");
    positions.forEach((position) => {
      const node = button(position, { "aria-pressed": String(position === state.position) });
      if (position === state.position) node.classList.add("is-active");
      node.addEventListener("click", () => {
        state.position = position;
        [...container.children].forEach((item) => {
          const active = item === node;
          item.classList.toggle("is-active", active);
          item.setAttribute("aria-pressed", String(active));
        });
        renderPlayers();
      });
      container.append(node);
    });

    document.querySelectorAll("[data-team]").forEach((node) => {
      node.addEventListener("click", () => {
        state.team = node.dataset.team;
        document.querySelectorAll("[data-team]").forEach((item) => {
          const active = item === node;
          item.classList.toggle("is-active", active);
          item.setAttribute("aria-pressed", String(active));
        });
        renderPlayers();
      });
    });

    $("#search").addEventListener("input", (event) => {
      state.query = normalize(event.target.value);
      renderPlayers();
    });
    $("#reset-filters").addEventListener("click", resetFilters);
  }

  function resetFilters() {
    state.team = "ALL";
    state.position = "すべて";
    state.query = "";
    $("#search").value = "";
    document.querySelectorAll("[data-team]").forEach((node) => {
      const active = node.dataset.team === "ALL";
      node.classList.toggle("is-active", active);
      node.setAttribute("aria-pressed", String(active));
    });
    $("#position-filters").querySelectorAll("button").forEach((node) => {
      const active = node.textContent === "すべて";
      node.classList.toggle("is-active", active);
      node.setAttribute("aria-pressed", String(active));
    });
    renderPlayers();
  }

  function filteredPlayers() {
    return state.players.filter((player) => {
      const searchable = normalize([player.name, player.fullName, player.reading].filter(Boolean).join(" "));
      return (state.team === "ALL" || player.eventTeam === state.team)
        && (state.position === "すべて" || player.position === state.position)
        && (!state.query || searchable.includes(state.query));
    });
  }

  function representativeAchievement(player) {
    const championships = (player.japanSeries || []).filter((series) => series.champion).map((series) => series.year);
    if (championships.length) return `${championships.join("・")} 日本シリーズ優勝`;
    const stats = player.careerStatsMarines || {};
    if (stats.games !== undefined) return `ロッテ在籍時 ${stats.games}試合`;
    return "スペシャルゲーム2026 出場";
  }

  function imageBlock(player, context) {
    const wrapper = el("div", `${context}__media`);
    const fallback = el("span", `${context}__fallback`, String(player.eventNumber));
    fallback.setAttribute("aria-hidden", "true");
    wrapper.append(fallback);
    if (player.links?.officialEventImage) {
      const image = el("img", `${context}__image`);
      image.src = player.links.officialEventImage;
      image.alt = `${player.name}のイベント公式写真`;
      image.loading = context === "player-card" ? "lazy" : "eager";
      image.addEventListener("error", () => wrapper.classList.add("image-error"));
      wrapper.append(image);
    } else {
      wrapper.classList.add("image-error");
    }
    return wrapper;
  }

  function playerCard(player) {
    const card = el("article", "player-card");
    card.append(imageBlock(player, "player-card"));
    card.append(el("span", "player-card__team", `TEAM ${player.eventTeam}`));
    const content = el("div", "player-card__content");
    const identity = el("div", "player-card__identity");
    identity.append(el("span", "player-card__number", String(player.eventNumber)));
    const names = el("div");
    names.append(el("h3", "", player.name), el("p", "player-card__position", `${player.position} / ${player.throwsBats}`));
    identity.append(names);
    content.append(identity, el("p", "player-card__summary", player.summary), el("p", "player-card__achievement", representativeAchievement(player)));
    card.append(content);
    const open = el("button", "card-button");
    open.type = "button";
    open.append(el("span", "", `${player.name}の詳細を見る`));
    open.addEventListener("click", () => openDetail(player));
    card.append(open);
    return card;
  }

  function renderPlayers() {
    const players = filteredPlayers();
    const grid = $("#players");
    grid.replaceChildren(...players.map(playerCard));
    grid.setAttribute("aria-busy", "false");
    $("#result-count").replaceChildren(document.createTextNode("表示 "), el("strong", "", players.length), document.createTextNode(` / ${state.players.length}人`));
    $("#empty-state").hidden = players.length !== 0;
  }

  function section(title, index, content) {
    const wrapper = el("section", "detail-section");
    const heading = el("div", "detail-section__heading");
    heading.append(el("span", "", String(index).padStart(2, "0")), el("h3", "", title));
    wrapper.append(heading, content);
    return wrapper;
  }

  function statsGrid(stats) {
    if (stats?.note && Object.keys(stats).every((key) => hiddenStatKeys.has(key))) return el("p", "stat-note", stats.note);
    const list = el("dl", "stats-grid");
    Object.entries(stats || {}).filter(([key]) => !hiddenStatKeys.has(key)).forEach(([key, value]) => {
      const item = el("div", "stat");
      item.append(el("dt", "", statLabels[key] || key), el("dd", "", String(value)));
      list.append(item);
    });
    return list.children.length ? list : el("p", "stat-note", stats?.note || "記録なし");
  }

  function profileFacts(player) {
    const list = el("dl", "profile-facts");
    [["守備位置", player.position], ["投打", player.throwsBats], ["ロッテ在籍", player.marinesTenure], ["イベント", `TEAM ${player.eventTeam}`]].forEach(([label, value]) => {
      const item = el("div");
      item.append(el("dt", "", label), el("dd", "", value));
      list.append(item);
    });
    return list;
  }

  function numberHistory(player) {
    const list = el("ul", "number-history");
    (player.jerseyNumbers || []).forEach((entry) => {
      const item = el("li");
      item.append(el("strong", "", String(entry.number)));
      // 「ロッテ在籍時」など検証用の暫定文言は表示せず、年次がある期間だけを掲載する。
      if (/\d{4}/.test(entry.period || "")) item.append(document.createTextNode(entry.period));
      list.append(item);
    });
    return list;
  }

  function seasons(player) {
    const container = el("div");
    Object.entries(player.seasonStats || {}).forEach(([year, stats]) => {
      if (stats.status === "not_in_pro_baseball" && !stats.note) return;
      const block = el("div", "year-block");
      block.append(el("p", "year-label", year), statsGrid(stats));
      container.append(block);
    });
    return container;
  }

  function series(player) {
    const list = el("ul", "series-list");
    (player.japanSeries || []).forEach((record) => {
      const item = el("li", "series-item");
      item.append(el("strong", "", `${record.year}年 日本シリーズ${record.champion ? "優勝" : "出場"}`));
      const details = record.highlights?.length ? record.highlights.join(" / ") : "出場記録あり";
      item.append(el("p", "", details));
      list.append(item);
    });
    if (!list.children.length) return el("p", "stat-note", "日本シリーズ出場なし");
    return list;
  }

  function externalLink(item) {
    const li = el("li");
    const anchor = el("a", "", item.label);
    anchor.href = item.url;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    li.append(anchor);
    return li;
  }

  function cheers(player) {
    const box = el("div", "cheer-box");
    box.append(el("p", "", player.cheers?.note || "応援歌情報なし"));
    const references = player.cheers?.references || [];
    if (references.length) {
      const links = el("ul", "link-list");
      links.append(...references.map(externalLink));
      box.append(links);
    }
    return box;
  }

  function sources(player) {
    const links = el("ul", "link-list");
    const items = [];
    if (player.links?.wikipedia) items.push({ label: "Wikipedia", url: player.links.wikipedia });
    // 共通のイベントページは各選手の参照先として重複表示しない。
    items.push(...(player.sources || []).filter((source) => source.url !== player.links?.officialEventPage));
    links.append(...items.map(externalLink));
    return links;
  }

  function openDetail(player) {
    const content = $("#dialog-content");
    const hero = el("header", "detail-hero");
    hero.append(imageBlock(player, "detail-hero"));
    const heroBody = el("div", "detail-hero__body");
    heroBody.append(el("p", "detail-hero__team", `TEAM ${player.eventTeam} / ${player.position}`));
    const identity = el("div", "detail-hero__name");
    identity.append(el("span", "detail-hero__number", String(player.eventNumber)));
    const nameBlock = el("div");
    const title = el("h2", "", player.name);
    title.id = "dialog-title";
    nameBlock.append(title, el("p", "detail-hero__reading", player.reading));
    identity.append(nameBlock);
    heroBody.append(identity);
    hero.append(heroBody);

    const main = el("div", "detail-main");
    main.append(el("p", "detail-summary", player.summary), profileFacts(player));
    let index = 1;
    if (player.jerseyNumbers?.length) main.append(section("背番号履歴", index++, numberHistory(player)));
    if (player.careerStatsMarines) main.append(section("ロッテ在籍時 通算成績", index++, statsGrid(player.careerStatsMarines)));
    const seasonContent = seasons(player);
    if (seasonContent.children.length) main.append(section("シーズン成績", index++, seasonContent));
    main.append(section("日本シリーズ", index++, series(player)));
    if (player.cheers) main.append(section("応援歌", index++, cheers(player)));
    main.append(section("外部リンク・出典", index++, sources(player)));
    content.replaceChildren(hero, main);
    $("#player-dialog").showModal();
    document.body.style.overflow = "hidden";
  }

  function closeDetail() {
    $("#player-dialog").close();
    document.body.style.overflow = "";
  }

  async function init() {
    try {
      const data = await loadData();
      state.players = Array.isArray(data.players) ? data.players : [];
      setupFilters();
      renderPlayers();
    } catch (error) {
      console.error(error);
      const grid = $("#players");
      grid.setAttribute("aria-busy", "false");
      grid.append(el("p", "stat-note", "選手データを読み込めませんでした。ローカルサーバー経由で開いてください。"));
    }
  }

  $("#dialog-close").addEventListener("click", closeDetail);
  $("#player-dialog").addEventListener("click", (event) => {
    if (event.target === event.currentTarget) closeDetail();
  });
  $("#player-dialog").addEventListener("close", () => { document.body.style.overflow = ""; });
  init();
})();
