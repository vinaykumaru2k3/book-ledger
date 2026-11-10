/**
 * Guesses a BCP 47 language tag from the script a piece of text is written in,
 * so book titles in any language get the right `lang` attribute (better fonts,
 * line breaking and screen-reader pronunciation). Returns undefined for Latin
 * text, where the page language already applies.
 */
const SCRIPTS = [
  [/[ಀ-೿]/, "kn"], // Kannada
  [/[ऀ-ॿ]/, "hi"], // Devanagari
  [/[஀-௿]/, "ta"], // Tamil
  [/[ఀ-౿]/, "te"], // Telugu
  [/[ഀ-ൿ]/, "ml"], // Malayalam
  [/[ঀ-৿]/, "bn"], // Bengali
  [/[઀-૿]/, "gu"], // Gujarati
  [/[਀-੿]/, "pa"], // Gurmukhi
  [/[؀-ۿ]/, "ar"], // Arabic script
  [/[぀-ヿ]/, "ja"], // Japanese kana (check before Han)
  [/[가-힯]/, "ko"], // Hangul
  [/[一-鿿]/, "zh"], // Han
  [/[Ѐ-ӿ]/, "ru"], // Cyrillic
  [/[Ͱ-Ͽ]/, "el"], // Greek
];

export function langOf(text = "") {
  const match = SCRIPTS.find(([pattern]) => pattern.test(text));
  return match ? match[1] : undefined;
}
