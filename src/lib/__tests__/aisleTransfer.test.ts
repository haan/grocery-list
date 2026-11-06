jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory:'cache/', writeAsStringAsync:jest.fn(async () => {}),
  readAsStringAsync:jest.fn(async () => ''),
}));
jest.mock('expo-sharing', () => ({isAvailableAsync:async () => false}));
jest.mock('expo-document-picker', () => ({getDocumentAsync:async () => ({canceled:false,assets:[{uri:'test'}]})}));
import * as FileSystem from 'expo-file-system/legacy';
import { exportLists, pickAndParseLists } from '../transfer';
import { makeList } from '../../data/list';
import { learnedCategory, preferenceKey } from '../../data/aislePreferences';

test('export/import preserves independent learned rules, custom aisles, and deletion markers', async () => {
  const original = { ...makeList('Example'), categoryOrder:['Produce','Local','Other'],
    aislePreferences:[{id:preferenceKey('Mëllech'),category:'Local',updatedAt:2},
      {id:'name:old',category:'Gone',updatedAt:3,deletedAt:3}] };
  await exportLists([original]);
  const text = jest.mocked(FileSystem.writeAsStringAsync).mock.calls[0][1];
  jest.mocked(FileSystem.readAsStringAsync).mockResolvedValueOnce(text);
  const [imported] = await pickAndParseLists();
  expect(imported.id).not.toBe(original.id);
  expect(imported.aislePreferences).not.toBe(original.aislePreferences);
  expect(learnedCategory(imported, 'Milch')).toBe('Local');
  expect(imported.aislePreferences?.find(p=>p.id === 'name:old')?.deletedAt).toBeDefined();
});

test('imports legacy data and drops invalid learned records', async () => {
  const legacy = makeList('Legacy');
  jest.mocked(FileSystem.readAsStringAsync).mockResolvedValueOnce(JSON.stringify({lists:[legacy,
    {...legacy,aislePreferences:[null,{id:'bad'}, {id:'name:foo',category:'Other',updatedAt:-1}]}]}));
  const imported = await pickAndParseLists();
  expect(imported).toHaveLength(2);
  expect(imported.map(l=>l.aislePreferences)).toEqual([[],[]]);
});
