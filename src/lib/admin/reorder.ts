/**
 * Moves the item with id `activeId` to the position of `overId` inside the
 * visible subset, then returns the FULL list with the visible items placed in
 * their new sequence and hidden items (e.g. archived) kept in their slots.
 * Returns null when nothing moved.
 */
export function reorderById<T extends { _id: string }>(
  all: T[],
  visibleIds: string[],
  activeId: string,
  overId: string,
): T[] | null {
  const from = visibleIds.indexOf(activeId);
  const to = visibleIds.indexOf(overId);
  if (from === -1 || to === -1 || from === to) return null;

  const nextVisible = [...visibleIds];
  nextVisible.splice(to, 0, ...nextVisible.splice(from, 1));

  const byId = new Map(all.map((item) => [item._id, item]));
  const visibleSet = new Set(visibleIds);
  let cursor = 0;
  return all.map((item) => (visibleSet.has(item._id) ? byId.get(nextVisible[cursor++])! : item));
}
