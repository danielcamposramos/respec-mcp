import os from "node:os";
import path from "node:path";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import {
  listProfiles,
  preflightSpec,
  scaffoldSource,
} from "../../src/core.js";
import { SecurityError } from "../../src/security.js";

async function seedRepo() {
  const root = await mkdtemp(path.join(os.tmpdir(), "respec-mcp-core-"));
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
        template_defaults: {
          github: "example/spec",
          latestVersion: "https://example.test/spec/",
        },
      },
      null,
      2
    )
  );

  await writeFile(
    path.join(root, "w3c.json"),
    JSON.stringify(
      {
        group: [174898],
        contacts: ["editor@example.test"],
        "repo-type": "cg-report",
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
        group_type: "cg",
        allowed_statuses: ["CG-DRAFT", "CG-FINAL"],
        default_status: "CG-DRAFT",
        repo_metadata_source: "w3c.json",
        source_root: "reports/source",
        build_root: "reports/build",
        default_source: "reports/source/index.html",
        status_templates: {
          "CG-DRAFT": "respec-mcp/templates/cg-draft.html",
        },
        respec_defaults: {
          title: "Example Spec",
          shortName: "example-spec",
          group: "cg/pm-kr",
          editors: [{ name: "Example Editor", company: "Example Org" }],
        },
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

  const template = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>{{title}}</title>
<script class="remove">
var respecConfig = {
  specStatus: {{specStatusJson}},
  shortName: {{shortNameJson}},
  group: {{groupJson}},
  github: {{githubJson}},
  latestVersion: {{latestVersionJson}},
  editors: {{editorsJson}},
};
</script>
</head>
<body>
<section id="abstract"><h2>Abstract</h2><p>A</p></section>
<section><h2>Introduction</h2><p><a href="https://www.w3.org/community/example/">group</a></p></section>
<section><h2>Security Considerations</h2><p>S</p></section>
<section><h2>Privacy Considerations</h2><p>P</p></section>
</body>
</html>`;

  await writeFile(
    path.join(root, "respec-mcp/templates/cg-draft.html"),
    template
  );

  return root;
}

describe("core: repo-local discovery and scaffolding", () => {
  let root;

  beforeAll(async () => {
    root = await seedRepo();
  });
  afterAll(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("listProfiles returns the profile", async () => {
    const result = await listProfiles(root);
    expect(result.default_profile).toBe("example-cg");
    expect(result.profiles[0].profile_id).toBe("example-cg");
  });

  it("scaffoldSource writes a source that satisfies compliance", async () => {
    const result = await scaffoldSource(
      { output: "reports/source/index.html", overrides: { title: "Draft" } },
      { repoRoot: root }
    );
    expect(result.compliance.valid).toBeTrue();
    expect(result.compliance.required_sections_missing).toEqual([]);
    expect(result.compliance.forbidden_phrase_hits).toEqual([]);

    const written = await readFile(
      path.join(root, "reports/source/index.html"),
      "utf-8"
    );
    expect(written).toContain("<title>Draft</title>");
  });

  it("scaffoldSource rejects paths outside the repo root", async () => {
    await expectAsync(
      scaffoldSource(
        { output: "../escape.html" },
        { repoRoot: root }
      )
    ).toBeRejectedWithError(SecurityError);
  });

  it("preflightSpec flags missing sections without rendering", async () => {
    await writeFile(
      path.join(root, "reports/source/bad.html"),
      `<!doctype html><html><body><h2>Abstract</h2></body></html>`
    );
    const result = await preflightSpec(
      { source: "reports/source/bad.html" },
      { repoRoot: root }
    );
    expect(result.rendered).toBeFalse();
    expect(result.compliance.valid).toBeFalse();
    expect(result.compliance.required_sections_missing).toContain("Introduction");
  });

  it("preflightSpec flags forbidden phrases with word boundaries", async () => {
    await writeFile(
      path.join(root, "reports/source/phrase.html"),
      `<!doctype html><html><body>
        <h2>Abstract</h2>
        <h2>Introduction</h2>
        <h2>Security Considerations</h2>
        <h2>Privacy Considerations</h2>
        <p>This is a W3C Recommendation.</p>
      </body></html>`
    );
    const result = await preflightSpec(
      { source: "reports/source/phrase.html" },
      { repoRoot: root }
    );
    expect(result.compliance.forbidden_phrase_hits).toContain("W3C Recommendation");
  });

  it("preflightSpec rejects http(s) sources", async () => {
    await expectAsync(
      preflightSpec(
        { source: "https://evil.example.com/x.html" },
        { repoRoot: root }
      )
    ).toBeRejectedWithError(SecurityError);
  });

  it("preflightSpec rejects path traversal in source", async () => {
    await expectAsync(
      preflightSpec(
        { source: "../../../etc/passwd" },
        { repoRoot: root }
      )
    ).toBeRejectedWithError(SecurityError);
  });
});
