/**
 * Select feed items with adaptive proposal visibility.
 *
 * Strategy:
 * - Show up to 3 entities (mix of missions and proposals)
 * - Simple slice for now, can be enhanced with scoring later
 */
export function selectFeedItems<T extends { region: string; category: string }>(entities: T[]): T[] {
  const count = Math.min(entities.length, 3);
  return entities.slice(0, count);
}
