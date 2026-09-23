export function normalizeSearchText(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLocaleLowerCase("ja")
    .replace(/[\s・]/g, "");
}

export function matchesPlayer(player, filters) {
  return (filters.team === "ALL" || player.team === filters.team)
    && (filters.position === "すべて" || player.position === filters.position)
    && (!filters.query || normalizeSearchText(player.search).includes(filters.query));
}
