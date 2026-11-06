/** Register future interface translations here; English lives in the base dictionaries. */
export type TranslationDictionary = { [key: string]: string | TranslationDictionary };
export const LOCALES: Record<string, TranslationDictionary> = {};
