import { checkDocuments, checkExitCode } from "../../src/check.js";
import { githubAnnotations, markdownReport } from "../../src/report.js";

function result({ pending = [], warnings = [], valid = true } = {}) {
  return { errors: [], warnings, compliance: {
    valid, pending_checks: pending, status_errors: [], document_status: "unofficial",
    required_sections_missing: [], required_links_missing: [], forbidden_phrase_hits: [],
  }, resolved_profile: { profile_id: "test" } };
}

describe("one-shot checks", () => {
  it("fails a preflight-only run with unresolved checks, but can resolve them through rendering", async () => {
    const ops = { preflightSpec: async () => result({ pending: ["Needs render"] }), validateSpec: async () => result() };
    expect(checkExitCode(await checkDocuments({ mode: "preflight" }, {}, ops))).toBe(1);
    expect(checkExitCode(await checkDocuments({ mode: "both" }, {}, ops))).toBe(0);
  });
  it("collects every document and distinguishes runtime failure from policy failure", async () => {
    const ops = { preflightSpec: async ({ source }) => {
      if (source === "missing") throw Error("missing file");
      return result({ valid: source !== "bad" });
    } };
    const report = await checkDocuments({ mode: "preflight", sources: ["bad", "good", "missing"] }, {}, ops);
    expect(report.documents.map(d => d.ok)).toEqual([false, true, false]);
    expect(checkExitCode(report)).toBe(2);
  });
  it("keeps warnings visible and optionally makes them fail", async () => {
    const ops = { validateSpec: async () => result({ warnings: [{ message: "Review this" }] }) };
    expect((await checkDocuments({ mode: "validate" }, {}, ops)).ok).toBeTrue();
    expect((await checkDocuments({ mode: "validate", failOnWarnings: true }, {}, ops)).ok).toBeFalse();
  });
  it("escapes untrusted diagnostics in Actions annotations and summaries", async () => {
    const report = await checkDocuments({ mode: "validate", sources: ["<img src=x> | source"] }, {}, {
      validateSpec: async () => result({ warnings: [{ message: "bad\n::error::injected\r100% <script>x</script>" }] }),
    });
    const annotations = githubAnnotations(report);
    expect(annotations).toContain("%0A::error::injected%0D100%25");
    expect(annotations.split("\n").filter(Boolean).length).toBe(1);
    expect(markdownReport(report)).not.toContain("<script>");
    expect(markdownReport(report)).not.toContain("<img");
  });
});
