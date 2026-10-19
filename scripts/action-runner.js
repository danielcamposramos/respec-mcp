import path from "node:path";
import { appendFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolveWithinRoot } from "../src/security.js";

try {
  const workspace = process.env.GITHUB_WORKSPACE || process.cwd();
  const repoRoot = resolveWithinRoot(workspace, process.env.RESPEC_REPO_ROOT || ".");
  const warnings = process.env.RESPEC_WARNINGS || "false";
  if (!["true", "false"].includes(warnings)) throw new Error("fail-on-warnings must be true or false");
  const report = resolveWithinRoot(repoRoot, ".respec-check/report.json");
  if (process.env.GITHUB_OUTPUT) {
    const delimiter = randomUUID();
    appendFileSync(process.env.GITHUB_OUTPUT, `report<<${delimiter}\n${report}\n${delimiter}\n`);
  }
  const args = [fileURLToPath(new URL("../bin/respec-check.js", import.meta.url)),
    "--repo-root", repoRoot, "--mode", process.env.RESPEC_MODE || "both",
    "--timeout", process.env.RESPEC_TIMEOUT || "120000",
    "--report", path.relative(repoRoot, report), "--github", "--disable-sandbox"];
  if (process.env.RESPEC_PROFILE) args.push("--profile", process.env.RESPEC_PROFILE);
  if (warnings === "true") args.push("--fail-on-warnings");
  // Input values never become shell code or CLI flags.
  args.push("--", ...(process.env.RESPEC_SOURCES || "").split(/\r?\n/).map(s => s.trim()).filter(Boolean));
  const child = spawnSync(process.execPath, args, { stdio: "inherit" });
  if (child.error) throw child.error;
  process.exitCode = child.status ?? 2;
} catch (error) {
  process.stderr.write(`respec action: ${JSON.stringify(String(error.message || error))}\n`);
  process.exitCode = 2;
}
