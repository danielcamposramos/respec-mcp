# Changelog

All notable changes to this project are documented in this file. The format is
based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this
project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-04-20

### Added

- Initial public release as a standalone package, extracted from
  [`speced/respec` PR #5168](https://github.com/speced/respec/pull/5168).
- Stdio MCP server (`respec-mcp`) exposing five tools: `respec_list_profiles`,
  `respec_scaffold`, `respec_preflight`, `respec_validate`, `respec_build`.
- MCP resources for the authoring guide (`respec-mcp://authoring-guide`) and
  repo-local profiles (`respec-mcp://profile/{profile_id}`).
- Repo-local profile discovery via `respec-mcp.config.json` and
  `respec-mcp/profiles/*.json`.
- Dockerfile (non-root, `--disable-sandbox` baked into ENTRYPOINT).
- Unit tests (security, template, compliance, core) and integration tests
  (full Puppeteer render pipeline).

### Security

- Path containment: every path input (`source`, `output`, `repo_metadata_source`,
  template, profile directory) is resolved through `resolveWithinRoot` and
  rejected if it escapes the configured repo root.
- Source URL restriction: `source` only accepts relative paths inside the repo
  root or `file://` URLs pointing inside the root. `http(s)://`, `data:`,
  `javascript:`, and other schemes are rejected to prevent Puppeteer from
  navigating to attacker-controlled URLs.
- `repo_root` is no longer accepted in tool inputs; the CLI-provided
  `--repo-root` is the enforced boundary.
- Prototype-pollution hardening: `overrides`, `template_defaults`, and
  `respec_defaults` are merged with a key filter that drops `__proto__`,
  `constructor`, and `prototype`.

### Changed

- `preflight` and `validate` are now behaviorally distinct:
  - `preflight`: fast source-only policy checks, no render.
  - `validate`: full ReSpec render via Puppeteer with diagnostics, no write.
  - `build`: full render plus output write.
- Compliance checks (required sections, required links, forbidden phrases) use
  DOM parsing (via `linkedom`) with word-boundary matching for phrases, not
  naive `String.includes()` against the raw HTML.

### Fixed

- `file://` sources are read via `fileURLToPath` + `readFile` rather than
  `fetch()`, which does not reliably support `file:` in Node.
- Template placeholders with dotted keys (`{{editors.primary.name}}`) now
  resolve against nested objects, matching the documented behavior.
- Published package now includes `docs/` so MCP responses that reference the
  authoring guide are valid for npm consumers.
