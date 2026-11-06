import { APP_STRINGS } from '../appStrings';
import { LOCALES } from '../locales';

type Dict = { [key: string]: string | Dict };

/** Resolve a dotted path to its string leaf, or undefined if absent. */
function leaf(d: Dict, path: string): string | undefined {
  const v = path.split('.').reduce<string | Dict | undefined>(
    (acc, k) => (acc && typeof acc === 'object' ? acc[k] : undefined),
    d
  );
  return typeof v === 'string' ? v : undefined;
}

/**
 * The leading run of literal text, i.e. everything before the first
 * placeholder or bracket. "Checked ({count})" -> "Checked". This is the part a
 * person actually reads off the screen and speaks.
 */
function leadingLiteral(s: string): string {
  return s.split(/[{(（]/)[0].replace(/[\s,、，:：.。]+$/u, '').trim();
}

/** English plus every locale that has had a domain translation pass. */
const DICTS: Array<[string, Dict]> = [
  ['en', APP_STRINGS as Dict],
  ...Object.entries(LOCALES)
    .filter(([, d]) => leaf(d as Dict, 'detail.checked') !== undefined)
    .map(([name, d]) => [name, d as Dict] as [string, Dict]),
];

/**
 * Controls whose accessible name adds detail to the visible text. The label
 * must START with what is written on the control.
 */
const PREFIX_PAIRS: Array<{ visible: string; label: string; what: string }> = [
  {
    visible: 'detail.checked',
    label: 'detail.checkedA11y',
    what: 'the Checked section toggle',
  },
];

/**
 * Rows named by a runtime value (an item name, a kit name). The value has to
 * come FIRST — "Add {name}" is unspeakable in English, "{name} hinzufügen" is
 * unspeakable in German. Leading with {name} is the only form that works in
 * every locale.
 */
const NAME_LED = [
  'detail.onListItemA11y',
  'kits.inKitItemA11y',
  'kits.addKitA11y',
];

describe('Voice Access can speak every accessible name', () => {
  describe.each(DICTS)('%s', (_locale, dict) => {
    it.each(PREFIX_PAIRS)(
      'the label for $what starts with the visible words',
      ({ visible, label }) => {
        const seen = leaf(dict, visible);
        const spoken = leaf(dict, label);
        // Locales are allowed to lack a key; key parity is a separate net.
        if (seen === undefined || spoken === undefined) return;
        expect(spoken.startsWith(leadingLiteral(seen))).toBe(true);
      }
    );

    it.each(NAME_LED)('%s leads with the name, not a verb', (key) => {
      const spoken = leaf(dict, key);
      if (spoken === undefined) return;
      expect(spoken.startsWith('{name}')).toBe(true);
    });
  });
});
