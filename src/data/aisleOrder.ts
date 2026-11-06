/** Apply just the dragged aisle's move to the current order. A remote addition
 * or deletion during the gesture must not be overwritten by a stale snapshot. */
export function applyAisleDrop(current: string[], moved: string, droppedOrder: string[]): string[] {
  if (!current.includes(moved)) return current; // removed/renamed remotely
  const position = droppedOrder.indexOf(moved);
  if (position < 0) return current;
  const next = current.filter(c => c !== moved);
  const after = droppedOrder.slice(position + 1).find(c => next.includes(c));
  const before = droppedOrder.slice(0, position).reverse().find(c => next.includes(c));
  if (after) next.splice(next.indexOf(after), 0, moved);
  else if (before) next.splice(next.indexOf(before) + 1, 0, moved);
  else return current;
  return next.every((c, i) => c === current[i]) ? current : next;
}
