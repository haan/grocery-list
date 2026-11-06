import { inferCategory, categoryLabel } from '../categories';
import { exactProduct, normalizeProductName } from '../catalog';

describe('LOD classification', () => {
  test.each([
    ['Mëllech', 'Dairy & eggs'], ['  MËLLECH  ', 'Dairy & eggs'], ['Eeër', 'Dairy & eggs'],
    ['Gromperen', 'Produce'], ['Grompere', 'Produce'], ['Baguettë', 'Bakery'],
    ['baguette', 'Bakery'], ['champignons', 'Produce'], ['Kartoffeln', 'Produce'],
    ['lait', 'Dairy & eggs'], ['Bio Mëllech 1L', 'Dairy & eggs'], ['jus de pomme bio', 'Beverages'],
    ['Toilettëpabeier', 'Household'], ['Zännseef', 'Personal care'],
    ['Paprika', 'Other'], ['Mëllech Brout', 'Other'], ['Seel', 'Other'],
    ['unknown product', 'Other'], ['', 'Other'], ['milk', 'Other'],
  ])('%s → %s regardless of menu language', (name, aisle) => {
    for (const locale of ['en', 'de', 'fr', 'ja']) expect(inferCategory(name, locale)).toBe(aisle);
  });
  test('keeps secondary headwords distinct and plurals together', () => {
    expect(exactProduct('Séiss Gromper')?.id).not.toBe(exactProduct('Gromper')?.id);
    expect(exactProduct('Gromperen')?.id).toBe(exactProduct('Kartoffeln')?.id);
    expect(exactProduct('Paprika')).toBeUndefined();
  });
  test('normalizes matching and displays Luxembourgish aisles only for built-ins', () => {
    expect(normalizeProductName('  Bio   Mëllech ')).toBe('bio mellech');
    expect(categoryLabel('Produce')).toBe('Uebst a Geméis');
    expect(categoryLabel('My aisle')).toBe('My aisle');
  });
});
