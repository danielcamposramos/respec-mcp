# Security Model

`respec-mcp` runs over stdio under the control of an MCP client (an LLM or an
agent). Every tool input should be treated as adversarial — not because the
user is malicious, but because document content processed by the LLM may
contain prompt-injection that manipulates tool calls.

This document describes the trust boundaries and the guarantees the server
enforces.

## Trust boundary: the repo root

The `--repo-root` CLI flag defines the one and only boundary. All tool
operations must read from, write to, or navigate to paths inside this root.

- Relative paths (`reports/source/index.html`) are resolved against the root.
- Absolute paths are allowed only if they already resolve inside the root.
- `file://` URLs are accepted only if the underlying path is inside the root.
- Any other URL scheme (`http:`, `https:`, `data:`, `javascript:`, etc.) is
  rejected.
- Paths containing `..` that escape the root are rejected.
- Null bytes in paths are rejected.

The `repo_root` field is **not** part of the tool input schema. An MCP client
cannot override the CLI-provided boundary per call. If you need to operate on
multiple repositories, run multiple server instances.

## Puppeteer navigation

`respec_validate` and `respec_build` drive ReSpec through a Puppeteer-hosted
Chromium instance. The URL Chromium navigates to is always a `file://` URL
derived from a path inside the repo root.

This prevents a scenario where an attacker-controlled document convinces the
LLM to pass an external URL, causing Chromium to navigate to an attacker host.

## Prototype pollution

Every merge of client-provided `overrides` (and of `template_defaults` /
`respec_defaults` from the JSON files) filters out the keys `__proto__`,
`constructor`, and `prototype`. Merges write into `Object.create(null)` and
use own-property iteration, so prototype-chain pollution via `__proto__` is
impossible regardless of engine behaviour.

Template placeholder resolution also refuses to traverse into `__proto__`.

## Input validation surface

Zod validates the shape of every tool input. On top of that, the server:

- Verifies paths through `resolveWithinRoot` before any filesystem call.
- Verifies source URLs through `resolveSourceUrl` before any Puppeteer
  navigation.
- Sanitizes `overrides` through `sanitizeOverrides` before any object merge.

## What this server does not protect against

- **Side effects in the repo itself.** If the user mounts a repo with
  sensitive files and the profile is configured to allow writing the output
  over them, the server will honour that. Write paths are bounded by the repo
  root, not by "only inside `build/`".
- **ReSpec's own behaviour.** ReSpec can fetch external resources during
  rendering (cross-refs, biblio data). Network isolation at that layer is the
  operator's responsibility (run Docker without network, run under a sandbox,
  etc.).
- **Resource exhaustion.** A maliciously large document can still consume
  memory or time up to the configured `--timeout`.

## Reporting

Open an issue on
[GitHub](https://github.com/danielcamposramos/respec-mcp/issues) or email the
maintainer privately for anything sensitive before filing publicly.
