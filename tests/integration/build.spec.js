import os from "node:os";
import path from "node:path";
import {
  mkdir,
  mkdtemp,
  rm,
  writeFile,
} from "node:fs/promises";
import { buildSpec, preflightSpec, validateSpec } from "../../src/core.js";

jasmine.DEFAULT_TIMEOUT_INTERVAL = 120000;

async function seedRepo() {
  const root = await mkdtemp(path.join(os.tmpdir(), "respec-mcp-build-"));
  await mkdir(path.join(root, "respec-mcp/profiles"), { recursive: true });
  await mkdir(path.join(root, "respec-mcp/templates"), { recursive: true });
  await mkdir(path.join(root, "reports/source"), { recursive: true });

  await writeFile(
    path.join(root, "respec-mcp.config.json"),
    JSON.stringify(
      {
        default_profile: "example-cg",
        profile_directory: "respec-mcp/profiles",
        source_root: "reports/source",
        build_root: "reports/build",
      },
      null,
      2
    )
  );

  await writeFile(
    path.join(root, "respec-mcp/profiles/example-cg.json"),
    JSON.stringify(
      {
        profile_id: "example-cg",
        label: "Example CG",
        allowed_statuses: ["CG-DRAFT"],
        default_status: "CG-DRAFT",
        source_root: "reports/source",
        build_root: "reports/build",
        required_sections: [
          "Abstract",
          "Introduction",
          "Security Considerations",
          "Privacy Considerations",
        ],
        required_links: ["https://www.w3.org/community/example/"],
        forbidden_phrases: ["W3C Recommendation"],
      },
      null,
      2
    )
  );

  await writeFile(
    path.join(root, "reports/source/index.html"),
    `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Test</title>
<script class="remove">
var respecConfig = {
  specStatus: "CG-DRAFT",
  shortName: "example-spec",
  group: "cg/pm-kr",
  github: "example/spec",
  editors: [{ name: "Example Editor", company: "Example Org" }],
};
</script>
<script async class="remove" src="https://www.w3.org/Tools/respec/respec-w3c"></script>
</head>
<body>
<section id="abstract"><p>Abstract body.</p></section>
<section id="sotd"><p>Draft Community Group Report.</p></section>
<section><h2>Introduction</h2><p>See <a href="https://www.w3.org/community/example/">group</a>.</p></section>
<section><h2>Security Considerations</h2><p>Security.</p></section>
<section><h2>Privacy Considerations</h2><p>Privacy.</p></section>
</body>
</html>`
  );
  return root;
}

describe("integration: full render pipeline", () => {
  let root;

  beforeAll(async () => {
    root = await seedRepo();
  });
  afterAll(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("validateSpec renders without writing", async () => {
    const result = await validateSpec(
      { source: "reports/source/index.html" },
      { repoRoot: root, useLocal: true, disableSandbox: true, timeout: 60000 }
    );
    expect(result.rendered).toBeTrue();
    expect(result.output).toBeNull();
    expect(result.errors.length).toBe(0);
  });

  it("buildSpec writes HTML to build root and reports compliance", async () => {
    const result = await buildSpec(
      { source: "reports/source/index.html" },
      { repoRoot: root, useLocal: true, disableSandbox: true, timeout: 60000 }
    );
    expect(result.rendered).toBeTrue();
    expect(result.output).toContain(path.join("reports", "build", "index.html"));
    expect(result.compliance.required_sections_missing).toEqual([]);
    expect(result.errors.length).toBe(0);
  });

  it("preflightSpec is cheap and does not render", async () => {
    const start = Date.now();
    const result = await preflightSpec(
      { source: "reports/source/index.html" },
      { repoRoot: root }
    );
    const elapsed = Date.now() - start;
    expect(result.rendered).toBeFalse();
    expect(elapsed).toBeLessThan(5000);
  });
});
