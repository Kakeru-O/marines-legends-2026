import { matchesPlayer, normalizeSearchText } from "./player-filter.mjs";
import { renderPlayerGuideHtml } from "./render.mjs";

const state = { team: "ALL", position: "すべて", query: "" };
const $ = (selector, root = document) => root.querySelector(selector);

async function loadData() {
  const embedded = $("#players-data").textContent.trim();
  if (embedded) return JSON.parse(embedded);
  const response = await fetch("../data/players.json");
  if (!response.ok) throw new Error(`選手データを取得できませんでした (${response.status})`);
  return response.json();
}

function playerEntries() {
  return [...document.querySelectorAll(".player-entry")];
}

function updateButtonGroup(selector, activeButton) {
  document.querySelectorAll(selector).forEach((button) => {
    const active = button === activeButton;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function applyFilters() {
  let visible = 0;
  playerEntries().forEach((entry) => {
    const matches = matchesPlayer({
      team: entry.dataset.team,
      position: entry.dataset.position,
      search: entry.dataset.search
    }, state);
    entry.hidden = !matches;
    if (matches) visible += 1;
  });
  $("#result-count").textContent = `${visible} / ${playerEntries().length}人`;
  $("#empty-state").hidden = visible !== 0;
}

function setupFilters(players) {
  const positionContainer = $("#position-filters");
  const positions = ["すべて", ...new Set(players.map((player) => player.position).filter(Boolean))];
  positionContainer.replaceChildren(...positions.map((position) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `filter-button${position === "すべて" ? " is-active" : ""}`;
    button.textContent = position;
    button.setAttribute("aria-pressed", String(position === "すべて"));
    button.addEventListener("click", () => {
      state.position = position;
      updateButtonGroup("#position-filters .filter-button", button);
      applyFilters();
    });
    return button;
  }));

  document.querySelectorAll("[data-team-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      state.team = button.dataset.teamFilter;
      updateButtonGroup("[data-team-filter]", button);
      applyFilters();
    });
  });
  $("#search").addEventListener("input", (event) => {
    state.query = normalizeSearchText(event.target.value);
    applyFilters();
  });
  $("#reset-filters").addEventListener("click", () => {
    state.team = "ALL";
    state.position = "すべて";
    state.query = "";
    $("#search").value = "";
    updateButtonGroup("[data-team-filter]", $("[data-team-filter='ALL']"));
    updateButtonGroup("#position-filters .filter-button", $("#position-filters .filter-button"));
    applyFilters();
  });
}

async function init() {
  try {
    const data = await loadData();
    const players = Array.isArray(data.players) ? data.players : [];
    const roster = $("#players");
    if (!roster.querySelector(".player-entry")) roster.innerHTML = renderPlayerGuideHtml(players);
    setupFilters(players);
    $("#filter-panel").hidden = false;
    roster.setAttribute("aria-busy", "false");
    applyFilters();
  } catch (error) {
    console.error(error);
    $("#players").setAttribute("aria-busy", "false");
  }
}

init();
