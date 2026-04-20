import { checkCompliance } from "../../src/compliance.js";

const HTML = `<!doctype html>
<html>
  <head>
    <title>Doc</title>
    <script>const forbidden = "W3C Recommendation";</script>
  </head>
  <body>
    <section id="abstract"><h2>Abstract</h2><p>body</p></section>
    <section><h2>Introduction</h2>
      <p>See <a href="https://www.w3.org/community/example/">group</a>.</p>
    </section>
    <section><h2>Security Considerations</h2><p>sec</p></section>
    <section><h2>Privacy Considerations</h2><p>privacy</p></section>
  </body>
</html>`;

describe("compliance.checkCompliance", () => {
  it("detects required sections via headings, not substring match", () => {
    const result = checkCompliance({
      html: HTML,
      sourceText: HTML,
      profile: {
        required_sections: ["Abstract", "Introduction", "Use Cases"],
      },
    });
    expect(result.required_sections_missing).toEqual(["Use Cases"]);
  });

  it("does not match section names inside body paragraphs", () => {
    const html = `<body><p>We briefly mention the Introduction in passing.</p></body>`;
    const result = checkCompliance({
      html,
      sourceText: html,
      profile: { required_sections: ["Introduction"] },
    });
    expect(result.required_sections_missing).toEqual(["Introduction"]);
  });

  it("detects required links in anchor hrefs", () => {
    const result = checkCompliance({
      html: HTML,
      sourceText: HTML,
      profile: {
        required_links: [
          "https://www.w3.org/community/example/",
          "https://github.com/example/spec",
        ],
      },
    });
    expect(result.required_links_missing).toEqual([
      "https://github.com/example/spec",
    ]);
  });

  it("ignores forbidden phrases that only appear in <script>", () => {
    const result = checkCompliance({
      html: HTML,
      sourceText: "",
      profile: { forbidden_phrases: ["W3C Recommendation"] },
    });
    expect(result.forbidden_phrase_hits).toEqual([]);
  });

  it("detects forbidden phrases in visible text", () => {
    const html = `<body><p>This is a W3C Recommendation.</p></body>`;
    const result = checkCompliance({
      html,
      sourceText: "",
      profile: { forbidden_phrases: ["W3C Recommendation"] },
    });
    expect(result.forbidden_phrase_hits).toEqual(["W3C Recommendation"]);
  });

  it("uses word boundaries for forbidden phrases", () => {
    const html = `<body><p>uncommittable</p></body>`;
    const result = checkCompliance({
      html,
      sourceText: "",
      profile: { forbidden_phrases: ["commit"] },
    });
    expect(result.forbidden_phrase_hits).toEqual([]);
  });
});
