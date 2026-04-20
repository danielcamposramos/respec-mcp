#!/usr/bin/env node
import path from "node:path";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sade from "sade";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createReSpecMcpServer } from "../src/server.js";

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const cli = sade("respec-mcp", true)
  .describe("Runs the ReSpec MCP server over stdio.")
  .option("--repo-root", "Repo root that bounds all tool operations.", process.cwd())
  .option("--profile", "Default profile id when the client does not specify one.")
  .option(
    "--timeout",
    "ReSpec render timeout in milliseconds.",
    300000
  )
  .option(
    "--use-local",
    "Inject the locally-installed ReSpec bundle instead of fetching from w3.org.",
    true
  )
  .option("--disable-sandbox", "Pass --no-sandbox to Chromium (required in Docker).", false)
  .option("--disable-gpu", "Disable GPU usage in Chromium.", false)
  .option("--devtools", "Run Chromium with DevTools open (debugging only).", false);

cli.action(async opts => {
  try {
    const version = await readVersion();
    const server = createReSpecMcpServer({
      version,
      repoRoot: path.resolve(opts["repo-root"]),
      defaultProfile: opts.profile,
      timeout: parseInt(String(opts.timeout), 10),
      useLocal: Boolean(opts["use-local"]),
      disableSandbox: Boolean(opts["disable-sandbox"]),
      disableGPU: Boolean(opts["disable-gpu"]),
      devtools: Boolean(opts.devtools),
    });
    const transport = new StdioServerTransport();
    await server.connect(transport);
  } catch (error) {
    process.stderr.write(`${error.stack || error}\n`);
    process.exit(1);
  }
});

cli.parse(process.argv, {
  unknown(flag) {
    process.stderr.write(`Unknown option: ${flag}\n`);
    process.exit(1);
  },
});

async function readVersion() {
  const { version } = JSON.parse(
    await readFile(path.join(packageDir, "package.json"), "utf-8")
  );
  return version;
}
