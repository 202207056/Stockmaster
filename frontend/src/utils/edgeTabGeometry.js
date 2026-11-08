export const EDGE_TAB_WIDTH = 30;
export const EDGE_TAB_HEIGHT = 48;
export const EDGE_TAB_GAP = 8;

/** Find the nearest free vertical slot without moving outside the usable viewport. */
export function placeEdgeTab(point, view, obstacles = []) {
  const maxX = Math.max(0, view.width - EDGE_TAB_WIDTH);
  const maxY = Math.max(0, view.height - EDGE_TAB_HEIGHT - 8);
  const minY = Math.min(76, maxY);
  const x = Math.max(0, Math.min(point.x, maxX));
  const y = Math.max(minY, Math.min(point.y, maxY));
  const nearby = obstacles.filter(other => x < other.x + EDGE_TAB_WIDTH + EDGE_TAB_GAP && x + EDGE_TAB_WIDTH + EDGE_TAB_GAP > other.x);
  const free = candidate => nearby.every(other => candidate + EDGE_TAB_HEIGHT + EDGE_TAB_GAP <= other.y || candidate >= other.y + EDGE_TAB_HEIGHT + EDGE_TAB_GAP);
  const candidates = [y, minY, maxY, ...nearby.flatMap(other => [other.y - EDGE_TAB_HEIGHT - EDGE_TAB_GAP, other.y + EDGE_TAB_HEIGHT + EDGE_TAB_GAP])]
    .filter(candidate => candidate >= minY && candidate <= maxY && free(candidate))
    .sort((a, b) => Math.abs(a - y) - Math.abs(b - y));
  if (candidates.length) return { x, y: candidates[0] };
  const opposite = x < maxX / 2 ? maxX : 0;
  const clearOtherEdge = obstacles.every(other => Math.abs(other.x - opposite) >= EDGE_TAB_WIDTH + EDGE_TAB_GAP);
  return { x: clearOtherEdge ? opposite : x, y };
}
