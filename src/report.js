import { findings } from "./check.js";

export function textReport(report) {
  const lines = [`ReSpec checks: ${report.ok ? "PASS" : "FAIL"} (${report.mode})`];
  for (const document of report.documents) {
    lines.push(`${document.ok ? "PASS" : "FAIL"} ${JSON.stringify(document.source)}`);
    for (const phase of document.phases) {
      lines.push(`  ${phase.phase}: ${phase.ok ? "pass" : "fail"}`);
      for (const finding of findings(phase)) lines.push(`    ${finding.level}: ${JSON.stringify(finding.message)}`);
    }
  }
  lines.push("Result covers configured checks only; human editorial review is still required.");
  return lines.join("\n") + "\n";
}

export function markdownReport(report) {
  const lines = [
    `## ReSpec checks: ${report.ok ? "PASS" : "FAIL"}`,
    "",
    "Checks against repository policy, not W3C endorsement or approval for publication. Human editorial review remains required.",
    "",
    `Mode: ${escapeMarkdown(report.mode)}. Warnings fail the check: ${report.fail_on_warnings ? "yes" : "no"}.`,
    `Tool: ${escapeMarkdown(report.versions?.tool || "unknown")}; ReSpec: ${escapeMarkdown(report.versions?.respec || "unknown")}.`,
    "",
    "| Source | Phase | Result | Profile | Document status | Warnings |",
    "| --- | --- | --- | --- | --- | --- |",
  ];
  for (const document of report.documents) {
    for (const phase of document.phases) {
      const result = phase.result;
      const pending = result?.compliance.pending_checks.length;
      const label = phase.ok ? pending ? "Pending render checks" : "Pass" : "Fail";
      lines.push(`| ${escapeMarkdown(document.source)} | ${phase.phase} | ${label} | ${escapeMarkdown(result?.resolved_profile.profile_id || "unavailable")} | ${escapeMarkdown(result?.compliance.document_status || "unverified")} | ${result?.warnings.length ?? "unknown"} |`);
    }
  }
  for (const document of report.documents) {
    lines.push("", `### ${escapeMarkdown(document.source)}`, "");
    for (const phase of document.phases) {
      const policy = phase.result?.policy;
      if (policy) lines.push(`- ${phase.phase} policy: ${escapeMarkdown(policy.profile_path)}, SHA-256 ${policy.profile_sha256}; config SHA-256 ${policy.config_sha256 || "none"}.`);
      for (const finding of findings(phase)) lines.push(`- **${phase.phase} / ${finding.level}:** ${escapeMarkdown(finding.message)}`);
    }
  }
  lines.push("", "Profile changes require review too. This result is relative to the policy revision listed above.", "");
  return lines.join("\n");
}

export function githubAnnotations(report) {
  const lines = [];
  for (const document of report.documents) {
    for (const phase of document.phases) {
      for (const finding of findings(phase)) {
        lines.push(`::${finding.level} title=ReSpec ${phase.phase}::${escapeCommand(`${document.source}: ${finding.message}`)}`);
      }
    }
  }
  // Bound log annotations; the full machine-readable report remains available.
  return lines.slice(0, 50).join("\n") + (lines.length ? "\n" : "");
}

function escapeCommand(value) {
  return String(value).replaceAll("%", "%25").replaceAll("\r", "%0D").replaceAll("\n", "%0A");
}

function escapeMarkdown(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replace(/[\\`*_[\]{}()#!|]/g, "\\$&").replace(/[\r\n]/g, " ");
}
