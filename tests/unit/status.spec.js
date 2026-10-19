import { assessStatus, readRenderedStatus, readSourceStatus } from "../../src/status.js";

describe("document status", () => {
  const state = { profile: { profile_id: "cg", allowed_statuses: ["CG-DRAFT"] } };
  it("reads a literal declaration without executing JavaScript", () => {
    expect(readSourceStatus(`<script>const respecConfig = {specStatus: 'CG-DRAFT', postProcess: [() => { throw Error('must not execute'); }]};</script>`)).toBe("CG-DRAFT");
    expect(readSourceStatus(`<script>// specStatus: 'REC'\nvar respecConfig = {specStatus: 'CG-DRAFT'};</script>`)).toBe("CG-DRAFT");
  });
  it("does not infer status from comments, dynamic values, spreads or later writes", () => {
    for (const code of [
      `// respecConfig = {specStatus: 'CG-DRAFT'}`,
      `const respecConfig = {specStatus: getStatus()};`,
      `const respecConfig = {specStatus: 'CG-DRAFT', ...other};`,
      `const respecConfig = {specStatus: 'CG-DRAFT'}; respecConfig.specStatus = 'REC';`,
    ]) expect(readSourceStatus(`<script>${code}</script>`)).toBeNull();
  });
  it("checks the actual status, not a permissible default or requested status", () => {
    const result = assessStatus("REC", { ...state, requestedStatus: "CG-DRAFT" });
    expect(result.status_allowed).toBeFalse();
    expect(result.status_errors.length).toBe(2);
  });
  it("defers unresolved source status but fails unverifiable rendered status", () => {
    expect(assessStatus(null, state).pending_checks.length).toBe(1);
    expect(assessStatus(null, state, { rendered: true }).status_errors.length).toBe(1);
  });
  it("reads exported ReSpec configuration and rejects ambiguous exports", () => {
    const config = `<script id="initialUserConfig" type="application/json">{"specStatus":"CG-DRAFT"}</script>`;
    expect(readRenderedStatus(config)).toBe("CG-DRAFT");
    expect(readRenderedStatus(config + config)).toBeNull();
    expect(readRenderedStatus(`<h2>CG-DRAFT</h2>`)).toBeNull();
  });
});
