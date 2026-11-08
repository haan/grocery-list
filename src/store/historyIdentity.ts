/** Recent names are local data. Preserve accents and spelling for display,
 * but share one Unicode-aware identity rule between memory and SQLite. */
export function historyKey(name: string): string {
  return name.trim().normalize('NFC').toLowerCase().normalize('NFC');
}
