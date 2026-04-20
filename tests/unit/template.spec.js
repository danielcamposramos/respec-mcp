import { applyTemplate, withJsonMirrors } from "../../src/template.js";

describe("template.applyTemplate", () => {
  it("replaces simple placeholders", () => {
    expect(applyTemplate("hello {{name}}", { name: "world" })).toBe("hello world");
  });

  it("returns empty string for missing keys", () => {
    expect(applyTemplate("hello {{name}}!", {})).toBe("hello !");
  });

  it("supports nested dotted keys", () => {
    const values = { editors: { primary: { name: "Ada" } } };
    expect(applyTemplate("{{editors.primary.name}}", values)).toBe("Ada");
  });

  it("does not traverse into __proto__", () => {
    const values = Object.create(null);
    values.title = "ok";
    const out = applyTemplate("{{__proto__.polluted}} {{title}}", values);
    expect(out).toBe(" ok");
  });

  it("coerces non-strings via String()", () => {
    expect(applyTemplate("{{count}}", { count: 42 })).toBe("42");
    expect(applyTemplate("{{flag}}", { flag: true })).toBe("true");
  });

  it("handles null/undefined values as empty", () => {
    expect(applyTemplate("{{a}}-{{b}}", { a: null, b: undefined })).toBe("-");
  });
});

describe("template.withJsonMirrors", () => {
  it("adds a Json-suffixed mirror for every key", () => {
    const mirrored = withJsonMirrors({ title: "ok", count: 3 });
    expect(mirrored.title).toBe("ok");
    expect(mirrored.titleJson).toBe('"ok"');
    expect(mirrored.countJson).toBe("3");
  });
});
