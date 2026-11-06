/** Test-only sample list built with production constructors. */
import { makeList, makeItem, type GroceryList } from '../../../data/list';

export function sampleLists(): GroceryList[] {
  const list = makeList('Weekly shop');
  const names = [
    'Bananas', 'Whole milk', 'Sourdough', 'Eggs', 'Chicken thighs',
    'Baby spinach', 'Cheddar', 'Olive oil', 'Coffee beans', 'Greek yogurt',
    'Tomatoes', 'Pasta',
  ];
  list.items = names.map((name) => makeItem(name));
  // A couple checked off so the progress UI reads as a real, mid-shop list.
  for (const i of [1, 4]) {
    list.items[i].checked = true;
    list.items[i].checkedAt = list.items[i].updatedAt;
  }

  return [list];
}
