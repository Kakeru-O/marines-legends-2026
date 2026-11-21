import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import vm from "node:vm";
import test from "node:test";
import { loadPlayers } from "../scripts/load-players.mjs";
import { matchesPlayer, normalizeSearchText } from "../src/player-filter.mjs";

// Small DOM fixture exercises the real app's event wiring without dependencies.
// Browser layout and native disclosure behavior still require visual QA.
class Element {
  constructor(dataset = {}) {
    this.dataset = dataset;
    this.hidden = false;
    this.textContent = "";
    this.value = "";
    this.attributes = {};
    this.events = {};
    this.children = [];
    this.classList = { toggle() {} };
  }
  setAttribute(key, value) { this.attributes[key] = value; }
  addEventListener(type, listener) { this.events[type] = listener; }
  replaceChildren(...children) { this.children = children; }
  fire(type, value) { this.events[type]({ target: { value } }); }
}

test("app events filter the rendered roster, update counts and reset an empty result", async () => {
  const root = resolve(import.meta.dirname, "..");
  const players = await loadPlayers(root);
  const entries = players.map(p => new Element({ team: p.eventTeam, position: p.position, search: `${p.name} ${p.reading}` }));
  const ids = Object.fromEntries(["players-data", "players", "position-filters", "result-count", "empty-state", "filter-panel", "search", "reset-filters"].map(id => [`#${id}`, new Element()]));
  ids["#players-data"].textContent = JSON.stringify({ players });
  ids["#players"].querySelector = () => entries[0];
  ids["#filter-panel"].hidden = true;
  const teams = ["ALL", "WHITE", "BLACK"].map(team => new Element({ teamFilter: team }));
  const document = {
    querySelector(selector) {
      if (ids[selector]) return ids[selector];
      if (selector === "[data-team-filter='ALL']") return teams[0];
      if (selector === "#position-filters .filter-button") return ids["#position-filters"].children[0];
      throw new Error(`Unexpected selector: ${selector}`);
    },
    querySelectorAll(selector) {
      if (selector === ".player-entry") return entries;
      if (selector === "[data-team-filter]") return teams;
      if (selector === "#position-filters .filter-button") return ids["#position-filters"].children;
      throw new Error(`Unexpected selector: ${selector}`);
    },
    createElement() { return new Element(); }
  };
  const source = (await readFile(resolve(root, "src/app.js"), "utf8")).replace(/^import .*;\n/gm, "");
  await vm.runInNewContext(source, {
    document, matchesPlayer, normalizeSearchText,
    renderPlayerGuideHtml() { throw new Error("Static roster must be retained"); },
    console: { error(error) { throw error; } }
  });
  const count = (expected) => {
    assert.equal(entries.filter(e => !e.hidden).length, expected);
    assert.equal(ids["#result-count"].textContent, `${expected} / 44人`);
    assert.equal(ids["#empty-state"].hidden, expected !== 0);
  };
  const position = (name) => ids["#position-filters"].children.find(e => e.textContent === name);
  count(44);
  assert.equal(ids["#filter-panel"].hidden, false);
  teams[1].fire("click"); count(21);
  assert.equal(teams[1].attributes["aria-pressed"], "true");
  position("投手").fire("click"); count(10);
  teams[2].fire("click"); count(9);
  position("捕手").fire("click"); count(3);
  position("内野手").fire("click"); count(7);
  position("外野手").fire("click"); count(4);
  ids["#search"].fire("input", "かとう しょうへい"); count(1);
  ids["#search"].fire("input", "加藤"); count(1);
  ids["#search"].fire("input", "該当なし"); count(0);
  ids["#reset-filters"].fire("click"); count(44);
  assert.equal(ids["#search"].value, "");
  assert.equal(teams[0].attributes["aria-pressed"], "true");
});
