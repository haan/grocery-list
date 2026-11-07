jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('../../feedback/log', () => ({ logEvent: jest.fn() }));

test.each(['es', 'de', 'fr', 'it', 'pt-BR', 'ja'])('saved removed language %s migrates to System and English text', async saved => {
  await jest.isolateModulesAsync(async () => {
    const storage = require('@react-native-async-storage/async-storage');
    storage.getItem.mockResolvedValueOnce(saved);
    storage.setItem.mockClear();
    const i18n = require('../index');
    const preference = require('../localePreference');
    i18n.setLocaleStrings({ common: { cancel: 'Test translation' } });
    preference.loadLocalePreference();
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(i18n.t('common.cancel')).toBe('Cancel');
    expect(preference.availableLocales()).toEqual(['lb']);
    expect(storage.setItem).toHaveBeenCalledWith('ja.locale.preference', 'system');
    preference.setLocalePreference('en');
    expect(storage.setItem).toHaveBeenLastCalledWith('ja.locale.preference', 'en');
    expect(i18n.t('common.cancel')).toBe('Cancel');
  });
});
