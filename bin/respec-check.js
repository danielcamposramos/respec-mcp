#!/usr/bin/env node
import path from "node:path";
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { parseArgs } from "node:util";
import { checkDocuments, checkExitCode } from "../src/check.js";
import { githubAnnotations, markdownReport, textReport } from "../src/report.js";
import { resolveWithinRoot } from "../src/security.js";

const HELP = `respec-check [sources...] [options]
  --repo-root <path>     Repository containing profiles and documents (default: .)
  --profile <id>         Repository profile (default: repository default)
  --status <status>      Assert the document's actual status; does not rewrite it
  --mode <mode>         both (default), preflight, or validate
  --format <format>     text (default) or json on stdout
  --report <path>       Write JSON inside the repository
  --github              Add escaped annotations and a GitHub job summary
  --fail-on-warnings    Make ReSpec warnings fail the check
  --timeout <ms>        Per-document render timeout (default: 300000)
  --disable-sandbox    Pass --no-sandbox to Chromium in an isolated CI runner
  --help                Show help
No sources: check the selected profile's default_source.
Exit: 0 checks passed; 1 policy/diagnostic failure or incomplete preflight;
      2 configuration, I/O, or rendering failure.
`;

try {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: {
    "repo-root": { type: "string", default: process.cwd() },
    profile: { type: "string" }, status: { type: "string" },
    mode: { type: "string", default: "both" }, format: { type: "string", default: "text" },
    report: { type: "string" }, github: { type: "boolean", default: false },
    "fail-on-warnings": { type: "boolean", default: false },
    "disable-sandbox": { type: "boolean", default: false },
    timeout: { type: "string", default: "300000" }, help: { type: "boolean", default: false },
  } });
  if (values.help) {
    process.stdout.write(HELP);
  } else {
    if (!["text", "json"].includes(values.format)) throw new Error("format must be text or json");
    const timeout = Number(values.timeout);
    if (!Number.isSafeInteger(timeout) || timeout <= 0) throw new Error("timeout must be a positive integer");
    const repoRoot = path.resolve(values["repo-root"]);
    const reportPath = values.report ? resolveWithinRoot(repoRoot, values.report) : null;
    const report = await checkDocuments({
      sources: positionals, profile: values.profile, status: values.status,
      mode: values.mode, failOnWarnings: values["fail-on-warnings"],
    }, { repoRoot, timeout, useLocal: true, disableSandbox: values["disable-sandbox"] });
    const require = createRequire(import.meta.url);
    report.versions = {
      tool: JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8")).version,
      respec: JSON.parse(await readFile(require.resolve("respec/package.json"), "utf8")).version,
    };
    const json = JSON.stringify(report, null, 2) + "\n";
    if (reportPath) {
      await mkdir(path.dirname(reportPath), { recursive: true });
      await writeFile(reportPath, json);
    }
    if (values.github) {
      // Keep --format json machine-readable even when annotations are enabled.
      process.stderr.write(githubAnnotations(report));
      if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, markdownReport(report));
    }
    process.stdout.write(values.format === "json" ? json : textReport(report));
    process.exitCode = checkExitCode(report);
  }
} catch (error) {
  process.stderr.write(`respec-check: ${JSON.stringify(String(error.message || error))}\n`);
  process.exitCode = 2;
}
