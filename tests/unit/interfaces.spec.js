import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { scaffoldSource } from "../../src/core.js";

const packageRoot = fileURLToPath(new URL("../../", import.meta.url));

describe("public CLI and MCP interfaces", () => {
  let root, client;
  beforeAll(async () => {
    root = await mkdtemp(path.join(os.tmpdir(), "respec-interfaces-"));
    await cp(path.join(packageRoot, "examples/example-explainer"), root, { recursive: true });
    await scaffoldSource({}, { repoRoot: root });
    client = new Client({ name: "interface-test", version: "1.0.0" });
    await client.connect(new StdioClientTransport({ command: process.execPath,
      args: [path.join(packageRoot, "bin/respec-mcp.js"), "--repo-root", root], stderr: "pipe" }));
  });
  afterAll(async () => { await client?.close(); await rm(root, { recursive: true, force: true }); });

  function check(args = []) {
    return spawnSync(process.execPath, [path.join(packageRoot, "bin/respec-check.js"),
      "--repo-root", root, "--mode", "preflight", "--format", "json", ...args], { encoding: "utf8" });
  }

  it("returns distinct success, policy failure and operational exit codes with JSON evidence", async () => {
    const good = check(["--github", "--report", "results/good.json"]);
    expect(good.status).toBe(0);
    expect(JSON.parse(good.stdout).ok).toBeTrue();
    expect(JSON.parse(await readFile(path.join(root, "results/good.json"), "utf8")).ok).toBeTrue();
    await writeFile(path.join(root, "bad.html"), '<html><script>var respecConfig={specStatus:"REC"};</script><body>Missing sections</body></html>');
    const bad = check(["bad.html"]);
    expect(bad.status).toBe(1);
    expect(JSON.parse(bad.stdout).documents[0].phases[0].result.compliance.status_allowed).toBeFalse();
    const missing = check(["missing.html"]);
    expect(missing.status).toBe(2);
    expect(JSON.parse(missing.stdout).documents[0].phases[0].error).toBeDefined();
  });

  it("discovers skills and reads full policy and shared multilingual guidance over stdio", async () => {
    expect(client.getServerVersion().version).toBe("0.2.0");
    expect((await client.listTools()).tools.length).toBe(5);
    const catalog = JSON.parse((await client.readResource({ uri: "respec-mcp://skills" })).contents[0].text);
    expect(catalog.skills.length).toBe(14);
    const profile = JSON.parse((await client.readResource({ uri: "respec-mcp://profile/example-explainer" })).contents[0].text);
    expect(profile.required_sections).toContain("Goals");
    const skill = await client.readResource({ uri: "respec-mcp://skill/w3c-explainer" });
    expect(skill.contents[0].text).toContain("Se for mais fácil para você");
    await expectAsync(client.readResource({ uri: "respec-mcp://skill/unknown" })).toBeRejected();
    const result = await client.callTool({ name: "respec_preflight", arguments: {} });
    expect(result.structuredContent.compliance.valid).toBeTrue();
  });
});
