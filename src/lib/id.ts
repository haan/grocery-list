let counter = 0;

export function makeId(prefix: string): string {
  counter = (counter + 1) % 1_000_000;
  const ts = Date.now().toString(36);
  const ctr = counter.toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}${ts}-${ctr}-${rand}`;
}
