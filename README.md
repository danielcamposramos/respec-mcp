# respec-mcp

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.23309002.svg)](https://doi.org/10.5281/zenodo.23309002)

[![CI](https://github.com/danielcamposramos/respec-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/danielcamposramos/respec-mcp/actions/workflows/ci.yml)
[![Editorial examples](https://github.com/danielcamposramos/respec-mcp/actions/workflows/editorial-checks.yml/badge.svg)](https://github.com/danielcamposramos/respec-mcp/actions/workflows/editorial-checks.yml)
[![npm](https://img.shields.io/npm/v/respec-mcp.svg)](https://www.npmjs.com/package/respec-mcp)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

**Human-led editorial checks for W3C-related documents, available through GitHub Actions, a command-line checker and MCP.** Maintainers define document rules in their repository; authors and AI assistants use the same preflight and [ReSpec](https://respec.org/) validation before review. Reviewers can inspect the result, diagnostics and policy revision directly on GitHub without installing an MCP client.

The project acts as a gate for configured editorial rules: required sections and links, permitted document statuses, flagged phrases and ReSpec diagnostics. A green result establishes those checks only. It does not establish W3C endorsement, group consensus, publication authorization or the correctness of the document's claims.

[Fourteen document skills](docs/W3C_SKILLS.md) cover explainers, specifications, CG reports, charters, reviews, implementation evidence, publication, meeting records, workshops and presentations. They identify the appropriate W3C tooling beyond ReSpec. Shared guidance lets authors explain ideas in their own language and receive help drafting English while preserving technical meaning and uncertainty.

> **Status:** incubating. See the [inline W3C discussion](https://github.com/speced/respec/pull/5168)
> that led to this package being extracted from ReSpec core.

## Why a separate package

ReSpec is consumed as a library by many projects. Bundling an MCP server and
its ~30 transitive dependencies (Express, Hono, jose, pkce-challenge, ...)
into every ReSpec install punishes every consumer for a feature only a few
use. Keeping the MCP as its own package lets ReSpec stay lean and lets this
server iterate on profile/policy design and security hardening independently.

## What it does

- **GitHub Actions:** review-visible checks, escaped diagnostic annotations, a job summary and a JSON evidence artifact. [Add it to a repository](docs/GITHUB_ACTIONS.md).
- **One-shot CLI:** `respec-check` runs the same checks locally and returns a meaningful exit code. [CLI usage](docs/USAGE.md#one-shot-checks-for-people-and-ci).
- **MCP:** the existing authoring workflow remains available, with human editorial control.

Five tools over stdio:

| Tool                   | What it does                                                                    |
| ---------------------- | ------------------------------------------------------------------------------- |
| `respec_list_profiles` | Lists repo-local profiles and their allowed statuses.                           |
| `respec_scaffold`      | Creates a new source document from a profile template.                          |
| `respec_preflight`     | Fast source-only policy check (sections, links, forbidden phrases). No render.  |
| `respec_validate`      | Full ReSpec render via Puppeteer with diagnostics. No write.                    |
| `respec_build`         | Full render and writes static HTML to the build root.                           |

MCP resources:

- `respec-mcp://authoring-guide` — guidance for LLMs producing W3C/CG reports.
- `respec-mcp://profile/{profile_id}` — resolved profile JSON.
- `respec-mcp://skills` — document-skill catalog and tool routing.
- `respec-mcp://skill/{skill_id}` — one document skill with shared editorial and multilingual guidance.

## Install

The new Action and checker are available from this repository. Until version 0.2.0 is published to npm, use a checkout for the new CLI (`npm ci`, then `node bin/respec-check.js --help`); the registry's older release does not include these additions.

```bash
npm install -g respec-mcp
```

Or run without installing:

```bash
npx -y respec-mcp --repo-root /path/to/spec-repo
```

## Quick start

1. In your spec repo, add `respec-mcp.config.json`:

   ```json
   {
     "default_profile": "example-cg",
     "profile_directory": "respec-mcp/profiles",
     "source_root": "reports/source",
     "build_root": "reports/build"
   }
   ```

2. Add a profile at `respec-mcp/profiles/example-cg.json`:

   ```json
   {
     "profile_id": "example-cg",
     "allowed_statuses": ["CG-DRAFT", "CG-FINAL"],
     "default_status": "CG-DRAFT",
     "default_source": "reports/source/index.html",
     "status_templates": {
       "CG-DRAFT": "respec-mcp/templates/cg-draft.html"
     },
     "required_sections": ["Abstract", "Introduction"],
     "required_links": ["https://www.w3.org/community/example/"],
     "forbidden_phrases": ["W3C Recommendation"]
   }
   ```

3. Point an MCP client at it:

   ```json
   {
     "mcpServers": {
       "respec-mcp": {
         "command": "npx",
         "args": ["-y", "respec-mcp", "--repo-root", "/path/to/spec-repo"],
         "transport": "stdio"
       }
     }
   }
   ```

Two worked examples ship in the repo. The CG fixture uses PM-KR’s real group identifier so ReSpec can resolve group metadata; its placeholder text is a demonstration, not a group publication. Replace the metadata and content when adopting it:

- [`examples/example-cg/`](./examples/example-cg) — Community Group report.
- [`examples/example-explainer/`](./examples/example-explainer) — W3C
  explainer skeleton following [TR/explainer-explainer/](https://www.w3.org/TR/explainer-explainer/).

## Wiring into MCP clients

All snippets below use `npx -y respec-mcp` (works once the package is on
npm). For local development before publishing, swap
`"command": "npx", "args": ["-y", "respec-mcp", ...]` for
`"command": "node", "args": ["/absolute/path/to/respec-mcp/bin/respec-mcp.js", ...]`.

Replace `/path/to/spec-repo` with the absolute path to your W3C / CG spec
repo (the one containing `respec-mcp.config.json`).

### Claude Code (`~/.claude/settings.json`)

Add a `respec-mcp` entry under `mcpServers`:

```json
{
  "mcpServers": {
    "respec-mcp": {
      "command": "npx",
      "args": ["-y", "respec-mcp", "--repo-root", "/path/to/spec-repo"]
    }
  }
}
```

Reload with `/mcp` or restart Claude Code.

### Codex CLI (`~/.codex/config.toml`)

```toml
[mcp_servers.respec-mcp]
command = "npx"
args = ["-y", "respec-mcp", "--repo-root", "/path/to/spec-repo"]
enabled = true
```

### Cline (VS Code extension `saoudrizwan.claude-dev`)

Edit
`~/.config/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`
(or use Cline's **MCP Servers → Configure** UI):

```json
{
  "mcpServers": {
    "respec-mcp": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "respec-mcp", "--repo-root", "/path/to/spec-repo"],
      "disabled": false,
      "autoApprove": [
        "respec_list_profiles",
        "respec_preflight",
        "respec_validate"
      ],
      "timeout": 300
    }
  }
}
```

Only the read-only tools are auto-approved. `respec_scaffold` and
`respec_build` write to disk and will prompt.

### Roo Code (VS Code extension `rooveterinaryinc.roo-cline`)

Edit
`~/.config/Code/User/globalStorage/rooveterinaryinc.roo-cline/settings/mcp_settings.json`.
Same shape as Cline, except Roo spells the transport type with a hyphen
in its HTTP variant — for stdio the `type` key is still `"stdio"`:

```json
{
  "mcpServers": {
    "respec-mcp": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "respec-mcp", "--repo-root", "/path/to/spec-repo"],
      "disabled": false,
      "autoApprove": [
        "respec_list_profiles",
        "respec_preflight",
        "respec_validate"
      ],
      "timeout": 300
    }
  }
}
```

### Verifying the handshake

From a terminal, send an `initialize` + `tools/list` over stdio:

```bash
printf '%s\n%s\n' \
  '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"probe","version":"0"}}}' \
  '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' \
  | npx -y respec-mcp --repo-root /path/to/spec-repo
```

You should see `serverInfo.name: "respec-mcp"` and the five tools listed.

## Security

Tool inputs in MCP are LLM-controlled and can be influenced by prompt
injection from document content. This server defends against that:

- **Path containment.** Every path input is resolved through a `resolveWithinRoot`
  check and rejected if it escapes the configured `--repo-root`.
- **URL restriction.** `source` accepts only relative paths or `file://` URLs
  inside the repo root. External source URLs are rejected. For local rendering, a temporary loopback server serves the bounded source and installed ReSpec assets; document scripts can still make network requests.
- **No client-side `repo_root` override.** The CLI flag is the boundary; the
  tool schema does not accept `repo_root`.
- **Prototype pollution hardening.** `overrides`, `template_defaults`, and
  `respec_defaults` are merged with key filters that drop `__proto__`,
  `constructor`, and `prototype`.

See [docs/SECURITY.md](./docs/SECURITY.md) for the full model.

## Docs

- [docs/USAGE.md](./docs/USAGE.md) — CLI flags, tool recommendations, client config.
- [docs/GITHUB_ACTIONS.md](./docs/GITHUB_ACTIONS.md) — reviewer-visible checks and their scope.
- [docs/W3C_SKILLS.md](./docs/W3C_SKILLS.md) — document families and their appropriate tools.
- [docs/EDITORIAL_PRINCIPLES.md](./docs/EDITORIAL_PRINCIPLES.md) — human authority, evidence limits and native-language collaboration.
- [docs/PROFILES.md](./docs/PROFILES.md) — profile and config schema.
- [docs/SECURITY.md](./docs/SECURITY.md) — trust boundaries and guarantees.
- [docs/AUTHORING_GUIDE.md](./docs/AUTHORING_GUIDE.md) — LLM authoring guide
  for W3C / Community Group reports.

## Docker

```bash
docker build -t respec-mcp:local .
docker run --rm -i -v /path/to/spec-repo:/workspace respec-mcp:local
```

The image runs as a non-root user and bakes `--disable-sandbox` into the
ENTRYPOINT so Chromium starts cleanly.

## Development

```bash
npm install
npm run test:unit          # fast, no Puppeteer
npm test                   # unit + integration (needs Chromium)
```

## Provenance

This package was extracted from
[speced/respec#5168](https://github.com/speced/respec/pull/5168). Thanks to
[@marcoscaceres](https://github.com/marcoscaceres) for the review that
reshaped this into a standalone package, and to the
[PM-KR Community Group](https://www.w3.org/community/pm-kr/) for the
real-world report authoring workflow that motivated the design.

## License

[MIT](./LICENSE). Integrates with ReSpec (W3C Software and Document License).
