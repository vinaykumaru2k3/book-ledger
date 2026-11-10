import { describe, expect, it } from "vitest";
import { langOf } from "./script";

describe("langOf", () => {
  it("recognises book titles in many scripts", () => {
    expect(langOf("ಕರ್ವಾಲೋ")).toBe("kn");
    expect(langOf("गोदान")).toBe("hi");
    expect(langOf("பொன்னியின் செல்வன்")).toBe("ta");
    expect(langOf("পথের পাঁচালী")).toBe("bn");
    expect(langOf("ノルウェイの森")).toBe("ja");
    expect(langOf("红楼梦")).toBe("zh");
    expect(langOf("Анна Каренина")).toBe("ru");
  });

  it("leaves Latin-script titles to the page language", () => {
    expect(langOf("Cien años de soledad")).toBeUndefined();
    expect(langOf("Middlemarch")).toBeUndefined();
    expect(langOf("")).toBeUndefined();
  });
});
