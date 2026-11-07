import { PRODUCTS } from '../seedCatalogData';
import { exactProduct } from '../catalog';
import { browseSuggestions } from '../suggestionBrowser';
import { starterItemsForLocale } from '../seedCatalog';
import manifest from '../../../scripts/lod/manifest.json';

test.each([
  ['Banann','Banannen'],['Gromper','Gromperen'],['Apel','Äppel'],['Ee','Eeër'],
  ['Mëllech','Mëllech'],['Räis','Räis'],['Brout','Brout'],['Zopp','Zopp'],
  ['Séiss Gromper','Séiss Gromperen'],['Kleng Tomat','Kleng Tomaten'],
  ['Rout Rommel','Rout Rommelen'],['Spaghetti','Spaghetti'],['Chips','Chips'],
])('%s has natural shopping label %s, retaining its identity', (alias,name)=>{
  const product=exactProduct(alias);
  expect(product?.name).toBe(name);
  expect(exactProduct(name)?.id).toBe(product?.id);
});
test('all products have explicit reviewed usage and preserve the previous alias',()=>{
  expect(manifest).toHaveLength(371);
  expect(PRODUCTS).toHaveLength(manifest.length);
  for(const row of manifest){
    expect(['plural','mass','collective','ambiguous']).toContain(row.shoppingLabel.usage);
    expect(row.shoppingLabel.reason.length).toBeGreaterThan(10);
    expect(row.aliases).toContain(row.shoppingLabel.originalName);
    expect(row.aliases).toContain(row.name);
    expect(PRODUCTS.find(p=>p.id===row.id)?.name).toBe(row.name);
  }
});
test('singular, plural, accents and foreign aliases lead to the same catalog row',()=>{
  for(const query of ['Apel','Äppel','appel','pommes','Äpfel']) {
    const matches=browseSuggestions(query,[]).filter(p=>p.name==='Äppel');
    expect(matches).toHaveLength(1);
  }
  expect(exactProduct('Grompere')?.name).toBe('Gromperen');
  expect(exactProduct('Gromperen')?.id).not.toBe(exactProduct('Séiss Gromperen')?.id);
  expect(starterItemsForLocale('lb').map(p=>p.name)).toEqual(expect.arrayContaining(['Gromperen','Tomaten','Äppel','Mëllech','Eeër']));
});
