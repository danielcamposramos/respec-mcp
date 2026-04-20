# respec-mcp

[![CI](https://github.com/danielcamposramos/respec-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/danielcamposramos/respec-mcp/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/respec-mcp.svg)](https://www.npmjs.com/package/respec-mcp)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

A stdio **Model Context Protocol** server that wraps
[ReSpec](https://respec.org/) rendering and adds repo-local profile
discovery, so AI agents can scaffold, preflight, validate, and build
W3C-style documents — Community Group reports, final reports, and
[explainers](https://www.w3.org/TR/explainer-explainer/) for TAG early
design review — using policies that live in the spec repository itself, not
in the MCP server.

> **Status:** incubating. See the [inline W3C discussion](https://github.com/speced/respec/pull/5168)
> that led to this package being extracted from ReSpec core.

## Why a separate package

ReSpec is consumed as a library by many projects. Bundling an MCP server and
its ~30 transitive dependencies (Express, Hono, jose, pkce-challenge, ...)
into every ReSpec install punishes every consumer for a feature only a few
use. Keeping the MCP as its own package lets ReSpec stay lean and lets this
server iterate on profile/policy design and security hardening independently.

## What it does

Five tools over stdio:

| Tool                   | What it does                                                                    |
| ---------------------- | ------------------------------------------------------------------------------- |
| `respec_list_profiles` | Lists repo-local profiles and their allowed statuses.                           |
| `respec_scaffold`      | Creates a new source document from a profile template.                          |
| `respec_preflight`     | Fast source-only policy check (sections, links, forbidden phrases). No render.  |
| `respec_validate`      | Full ReSpec render via Puppeteer with diagnostics. No write.                    |
| `respec_build`         | Full render and writes static HTML to the build root.                           |

Two MCP resources:

- `respec-mcp://authoring-guide` — guidance for LLMs producing W3C/CG reports.
- `respec-mcp://profile/{profile_id}` — resolved profile JSON.

## Install

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

Two complete worked examples ship in the repo:

- [`examples/example-cg/`](./examples/example-cg) — Community Group report.
- [`examples/example-explainer/`](./examples/example-explainer) — W3C
  explainer skeleton following [TR/explainer-explainer/](https://www.w3.org/TR/explainer-explainer/).

## Security

Tool inputs in MCP are LLM-controlled and can be influenced by prompt
injection from document content. This server defends against that:

- **Path containment.** Every path input is resolved through a `resolveWithinRoot`
  check and rejected if it escapes the configured `--repo-root`.
- **URL restriction.** `source` accepts only relative paths or `file://` URLs
  inside the repo root. `http(s)`, `data:`, `javascript:` are rejected so
  Puppeteer never navigates to attacker-controlled URLs.
- **No client-side `repo_root` override.** The CLI flag is the boundary; the
  tool schema does not accept `repo_root`.
- **Prototype pollution hardening.** `overrides`, `template_defaults`, and
  `respec_defaults` are merged with key filters that drop `__proto__`,
  `constructor`, and `prototype`.

See [docs/SECURITY.md](./docs/SECURITY.md) for the full model.

## Docs

- [docs/USAGE.md](./docs/USAGE.md) — CLI flags, tool recommendations, client config.
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
