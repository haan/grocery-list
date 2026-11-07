import lb from './lb.json';
/** English lives in the base dictionaries. */
export type TranslationDictionary = { [key: string]: string | TranslationDictionary };
export const LOCALES: Record<string, TranslationDictionary> = { lb };
