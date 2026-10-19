# Security Model

`respec-mcp` runs over stdio under the control of an MCP client (an LLM or an
agent). Every tool input should be treated as adversarial — not because the
user is malicious, but because document content processed by the LLM may
contain prompt-injection that manipulates tool calls.

This document describes input checks and their limits. The checker is not a sandbox for untrusted repositories or browser code.

## Trust boundary: the repo root

The `--repo-root` CLI flag defines the one and only boundary. File arguments accepted by the tools must resolve inside this root. This is an input boundary, not an operating-system sandbox.

- Relative paths (`reports/source/index.html`) are resolved against the root.
- Absolute paths are allowed only if they already resolve inside the root.
- `file://` URLs are accepted only if the underlying path is inside the root.
- Any other URL scheme (`http:`, `https:`, `data:`, `javascript:`, etc.) is
  rejected.
- Paths containing `..` that escape the root are rejected.
- Null bytes in paths are rejected.
- Existing symlinks and symlinked parents of new paths are resolved before checking containment, including dangling symlink targets. Concurrent filesystem changes can still race these checks; use an isolated checkout for untrusted input.

The `repo_root` field is **not** part of the tool input schema. An MCP client
cannot override the CLI-provided boundary per call. If you need to operate on
multiple repositories, run multiple server instances.

## Puppeteer navigation

`respec_validate` and `respec_build` execute document JavaScript in Chromium. By default a temporary server bound to `127.0.0.1` serves the selected source, repository assets and installed ReSpec bundles, including the highlighter. It uses an ephemeral port and shuts down after rendering. Repository asset paths pass the same containment checks; this is not an authenticated file server and other local processes can reach it while it runs.

With local bundles disabled, rendering uses a `file://` source. In either mode the API rejects externally supplied source URLs. Documents can still load remote resources, execute scripts and make network requests. Repository containment does not make hostile document JavaScript safe. Run untrusted PRs on disposable runners without secrets or privileged tokens, and review any use of `--disable-sandbox`. The supplied Action uses this option on GitHub-hosted Linux runners; it is not a recommendation for a privileged workstation service.

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
- **Document scripts and ReSpec's own behaviour.** ReSpec can fetch external resources during
  rendering (cross-refs, biblio data). Network isolation at that layer is the
  operator's responsibility (run Docker without network, run under a sandbox,
  etc.).
- **Resource exhaustion.** A maliciously large document can still consume
  memory or time up to the configured `--timeout`.

## Reporting

Open an issue on
[GitHub](https://github.com/danielcamposramos/respec-mcp/issues) or email the
maintainer privately for anything sensitive before filing publicly.
