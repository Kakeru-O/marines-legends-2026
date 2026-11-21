import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";

// Manifest owns event metadata. Mirrors in individual files detect stale edits.
export function validateRoster(manifest, files) {
  if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.players) || !manifest.players.length) {
    throw new Error("Invalid players_list.json schema");
  }
  const ids = new Set();
  const filenames = new Set();
  const orders = new Set();
  const players = manifest.players.map((entry) => {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.id || "")) throw new Error("Invalid player id");
    if (ids.has(entry.id)) throw new Error(`Duplicate id: ${entry.id}`);
    ids.add(entry.id);
    if (entry.file !== `${entry.id}.json` || filenames.has(entry.file)) throw new Error(`Invalid/duplicate file: ${entry.file}`);
    filenames.add(entry.file);
    if (!Number.isInteger(entry.order) || entry.order < 1 || orders.has(entry.order)) throw new Error(`Invalid/duplicate order: ${entry.id}`);
    orders.add(entry.order);
    if (!["WHITE", "BLACK"].includes(entry.eventTeam)
      || !["投手", "捕手", "内野手", "外野手"].includes(entry.position)
      || !/^\d{1,2}$/.test(String(entry.eventNumber ?? ""))) throw new Error(`Invalid event metadata: ${entry.id}`);
    const player = files.get(entry.file);
    if (!player) throw new Error(`Missing player JSON: ${entry.file}`);
    if (player.id !== entry.id) throw new Error(`ID mismatch: ${entry.file}`);
    for (const key of ["eventTeam", "eventNumber", "position"]) {
      if (player[key] !== undefined && String(player[key]) !== String(entry[key])) throw new Error(`${key} mismatch: ${entry.id}`);
    }
    for (const key of ["name", "reading", "throwsBats", "marinesTenure", "summary"]) {
      if (typeof player[key] !== "string" || !player[key].trim()) throw new Error(`Missing ${key}: ${entry.id}`);
    }
    if (!player.sources?.length || !player.jerseyNumbers?.length || !player.careerStatsMarines) throw new Error(`Missing profile data: ${entry.id}`);
    for (const source of player.sources) {
      if (!source.label || !/^https?:\/\//.test(source.url || "")) throw new Error(`Invalid source: ${entry.id}`);
    }
    return { ...player, eventTeam: entry.eventTeam, eventNumber: entry.eventNumber, position: entry.position, order: entry.order };
  });
  for (const filename of files.keys()) {
    if (!filenames.has(filename)) throw new Error(`Unlisted player JSON: ${filename}`);
  }
  return players.sort((a, b) => a.order - b.order);
}

export async function loadPlayers(root) {
  const directory = resolve(root, "data/players");
  const manifest = JSON.parse(await readFile(resolve(root, "data/players_list.json"), "utf8"));
  const filenames = (await readdir(directory)).filter((name) => name.endsWith(".json"));
  const files = new Map(await Promise.all(filenames.map(async (name) => [name, JSON.parse(await readFile(resolve(directory, name), "utf8"))])));
  return validateRoster(manifest, files);
}
