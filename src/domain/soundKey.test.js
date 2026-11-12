import { describe, expect, it } from "vitest";
import { kannadaToLatin, soundKey, soundsAlike } from "./soundKey";

describe("kannadaToLatin", () => {
  it("writes Kannada in Latin letters, with the inherent vowel and the virama", () => {
    expect(kannadaToLatin("ಮೂಕಜ್ಜಿಯ ಕನಸುಗಳು")).toBe("muukajjiya kanasugalu");
    expect(kannadaToLatin("ಕುವೆಂಪು")).toBe("kuvempu");
    expect(kannadaToLatin("Dune ೨")).toBe("Dune 2");
  });
});

describe("soundKey", () => {
  it("gives every spelling of a Kannada title, and the original, one key", () => {
    const key = soundKey("ಮೂಕಜ್ಜಿಯ ಕನಸುಗಳು");
    expect(soundKey("Mookajjiya Kanasugalu")).toBe(key);
    expect(soundKey("mukajjiya kanasugaḷu")).toBe(key);
    expect(soundsAlike("Kanooru Heggadathi", "ಕಾನೂರು ಹೆಗ್ಗಡತಿ")).toBe(true);
    expect(soundsAlike("ಕಾನೂರು ಹೆಗ್ಗಡಿತಿ", "Kanuru Heggaditi")).toBe(true);
    expect(soundsAlike("Sri Ramayana Darshanam", "ಶ್ರೀ ರಾಮಾಯಣ ದರ್ಶನಂ")).toBe(true);
  });

  it("keeps different titles apart and does not trust very short keys", () => {
    expect(soundsAlike("ಮಲೆಗಳಲ್ಲಿ ಮದುಮಗಳು", "ಕಾನೂರು ಹೆಗ್ಗಡತಿ")).toBe(false);
    expect(soundsAlike("Parva", "Karvalo")).toBe(false);
    expect(soundsAlike("Kim", "Kim")).toBe(false);
  });
});
