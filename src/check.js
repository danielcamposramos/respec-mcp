import { preflightSpec, validateSpec } from "./core.js";

// Used by the one-shot CLI and Action. MCP tools keep using these same cores.
export async function checkDocuments(input, options, operations = { preflightSpec, validateSpec }) {
  const { sources = [], mode = "both", profile, status, failOnWarnings = false } = input;
  if (!["both", "preflight", "validate"].includes(mode)) throw new Error(`Unknown check mode: ${mode}`);
  const documents = [];
  for (const source of sources.length ? sources : [undefined]) {
    const document = { source: source || "(profile default)", phases: [], ok: true };
    for (const phase of mode === "both" ? ["preflight", "validate"] : [mode]) {
      try {
        const result = await operations[`${phase}Spec`]({ source, profile, status }, options);
        const pending = result.compliance.pending_checks || [];
        const ok = result.compliance.valid &&
          (!failOnWarnings || !result.warnings.length) &&
          (mode === "both" && phase === "preflight" || !pending.length);
        document.phases.push({ phase, ok, result });
        document.ok &&= ok;
      } catch (error) {
        document.phases.push({ phase, ok: false, error: String(error.message || error) });
        document.ok = false;
      }
    }
    documents.push(document);
  }
  return {
    schema_version: 1,
    mode,
    fail_on_warnings: failOnWarnings,
    ok: documents.every(document => document.ok),
    documents,
  };
}

export function findings(phase) {
  if (phase.error) return [{ level: "error", message: phase.error }];
  const { compliance, errors, warnings } = phase.result;
  return [
    ...errors.map(error => ({ level: "error", message: error.message })),
    ...compliance.status_errors.map(message => ({ level: "error", message })),
    ...compliance.required_sections_missing.map(name => ({ level: "error", message: `Missing section: ${name}` })),
    ...compliance.required_links_missing.map(link => ({ level: "error", message: `Missing required link: ${link}` })),
    ...compliance.forbidden_phrase_hits.map(phrase => ({ level: "error", message: `Forbidden phrase: ${phrase}` })),
    ...warnings.map(warning => ({ level: "warning", message: warning.message })),
    ...compliance.pending_checks.map(message => ({ level: "notice", message })),
  ];
}

export function checkExitCode(report) {
  if (report.documents.some(document => document.phases.some(phase => phase.error))) return 2;
  return report.ok ? 0 : 1;
}
