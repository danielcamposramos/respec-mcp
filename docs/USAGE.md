# Usage

`respec-mcp` is a stdio Model Context Protocol server. MCP-aware clients (AI
agents, editors, CLIs) spawn it and talk to it over stdin/stdout.

## CLI flags

```
respec-mcp [options]

  --repo-root <path>     Repo root that bounds all tool operations.
                         Defaults to the current working directory.
  --profile <id>         Default profile id when the client does not pass one.
  --timeout <ms>         ReSpec render timeout (default: 300000).
  --use-local            Inject the locally-installed ReSpec bundle instead of
                         fetching from w3.org. (Default: true.)
  --disable-sandbox      Pass --no-sandbox to Chromium. Required in Docker and
                         unprivileged containers. (Default: false.)
  --disable-gpu          Disable GPU usage in Chromium.
  --devtools             Run Chromium with DevTools open (debugging only).
```

## Tools

| Tool | Render? | Writes? | Use when                                        |
| ---- | :----: | :-----: | ----------------------------------------------- |
| `respec_list_profiles` | — | — | Discovering profiles and allowed statuses. |
| `respec_scaffold`      | — | yes | Creating a new source document from a template. |
| `respec_preflight`     | — | — | Cheap source-only policy check before rendering. |
| `respec_validate`      | yes | — | Full ReSpec render with diagnostics, no write. |
| `respec_build`         | yes | yes | Producing the final static HTML. |

### Recommended order

```
list_profiles → (edit source) → preflight → validate → build
```

Preflight catches the cheap class of issues (missing sections, forbidden
phrases). Validate catches ReSpec diagnostics that only appear after render.
Build is the only step that writes output.

## Resources

- `respec-mcp://authoring-guide` — LLM authoring guide (Markdown).
- `respec-mcp://profile/{profile_id}` — resolved profile JSON.

## Client configuration

### Claude Code / Cline / other MCP clients

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

### Docker

```bash
docker build -t respec-mcp:local .
docker run --rm -i -v /path/to/spec-repo:/workspace respec-mcp:local
```

In MCP settings:

```json
{
  "mcpServers": {
    "respec-mcp": {
      "command": "docker",
      "args": [
        "run", "--rm", "-i",
        "-v", "/path/to/spec-repo:/workspace",
        "respec-mcp:local"
      ],
      "transport": "stdio"
    }
  }
}
```

The Docker image runs as a non-root user and bakes `--disable-sandbox` into
the ENTRYPOINT so Chromium starts cleanly under an unprivileged UID.

### Direct CLI (for scripting or CI)

```bash
node bin/respec-mcp.js --repo-root /path/to/spec-repo
```

## Troubleshooting

- **"Non-file URL schemes are not permitted for source"** — Pass a relative
  path inside the repo root, or a `file://` URL that resolves inside it.
- **"Path ... resolves outside of the allowed repo root"** — Same. The MCP
  will not read or write outside `--repo-root`.
- **"No profiles are configured"** — Add `respec-mcp.config.json` and a
  profile JSON to the repo. See [PROFILES.md](./PROFILES.md).
- **Chromium fails to start in Docker** — The provided Dockerfile bakes
  `--disable-sandbox`. If you build a custom image, either run as non-root
  with `--disable-sandbox` or give the container `SYS_ADMIN` capability.
