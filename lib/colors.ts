// Presence colors are picked to be distinct from the accent (#1C6E8C) and
// from each other, and to stay legible on the light canvas background.
export const PRESENCE_COLORS = [
  "#E8735C", // coral
  "#8B5FBF", // violet
  "#4E8F52", // moss
  "#CC9A2E", // gold
  "#C25B8F", // plum
  "#3F7FBF", // slate blue
] as const;

/** Stable color per user id so a given person keeps the same color across sessions. */
export function colorForUserId(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash << 5) - hash + userId.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % PRESENCE_COLORS.length;
  return PRESENCE_COLORS[index];
}
