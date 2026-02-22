export function arrayMove<T>(array: T[], from: number, to: number): T[] {
  const next = array.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function buildSortOrderUpdates<T extends { id: string }>(items: T[]) {
  return items.map((item, index) => ({ id: item.id, sort_order: index }));
}
