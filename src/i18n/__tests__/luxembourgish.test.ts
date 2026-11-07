import { getLocales } from 'expo-localization';
import { getActiveLocale, applyDeviceLocale, t, formatNumber, resetToBaseStrings, pickLocale } from '../index';
import { setLocalePreference, refreshSystemLocale } from '../localePreference';
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('../../feedback/log', () => ({logEvent: jest.fn()}));
const nativeLocales = getLocales as jest.Mock;
const phone = (...tags: string[]) => nativeLocales.mockReturnValue(tags.map(languageTag=>({languageTag})));
afterEach(()=>{phone('en-US');setLocalePreference('system');resetToBaseStrings();});

test.each(['lb','lb-LU','lb_LU'])('recognizes Luxembourgish tag %s', tag=>{
  expect(pickLocale(tag)).toBe('lb');
  phone(tag); applyDeviceLocale();
  expect(t('home.title')).toBe('Akafslëscht');
});
test('respects native preference order, with English fallback',()=>{
  phone('fr-FR','lb-LU','en-US');applyDeviceLocale();expect(getActiveLocale()).toBe('lb');
  phone('en-GB','lb-LU');applyDeviceLocale();expect(getActiveLocale()).toBe('en');
  phone('fr-FR');applyDeviceLocale();expect(t('home.title')).toBe('Grocery List');
});
test('explicit choices override native language, including foreground changes',()=>{
  phone('en-US');setLocalePreference('lb');
  expect(t('settings.title')).toBe('Astellungen');
  expect(formatNumber(1234.5)).toBe(new Intl.NumberFormat('lb').format(1234.5));
  refreshSystemLocale();expect(getActiveLocale()).toBe('lb');
  phone('lb-LU');setLocalePreference('en');refreshSystemLocale();
  expect(t('settings.title')).toBe('Settings');
  setLocalePreference('system');expect(getActiveLocale()).toBe('lb');
  phone('en-US');refreshSystemLocale();expect(getActiveLocale()).toBe('en');
});
test('saved Luxembourgish is restored at cold start',async()=>{
  await jest.isolateModulesAsync(async()=>{
    const storage=require('@react-native-async-storage/async-storage');
    storage.getItem.mockResolvedValueOnce('lb');
    const preference=require('../localePreference');
    preference.loadLocalePreference();
    await new Promise(resolve=>setTimeout(resolve,0));
    expect(require('../index').t('home.title')).toBe('Akafslëscht');
  });
});
