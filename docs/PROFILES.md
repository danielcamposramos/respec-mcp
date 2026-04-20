# Profile and Repo-Local Configuration Reference

Each consuming spec repository declares its own policy and templates. The MCP
server discovers them from the repo root — no server-side configuration.

## File layout

```
<repo-root>/
├── respec-mcp.config.json          # repo-wide defaults
└── respec-mcp/
    ├── profiles/                   # one JSON file per profile
    │   ├── example-cg.json
    │   └── example-cg-final.json
    └── templates/                  # ReSpec HTML templates referenced by profiles
        ├── cg-draft.html
        └── cg-final.html
```

All paths referenced from JSON must stay within the repo root. Any value that
resolves outside the repo root (through `../` or absolute paths) is rejected.

## `respec-mcp.config.json`

| Field               | Type     | Purpose                                           |
| ------------------- | -------- | ------------------------------------------------- |
| `default_profile`   | string   | Profile id used when no profile is passed.        |
| `profile_directory` | string   | Directory containing profile JSON files. Default: `respec-mcp/profiles`. |
| `profile_paths`     | string[] | Explicit list of profile paths (overrides `profile_directory`). |
| `source_root`       | string   | Default directory for source documents. Default: `reports/source`. |
| `build_root`        | string   | Default directory for rendered output. Default: `reports/build`. |
| `template_defaults` | object   | Template variables merged under profile defaults and request overrides. |

## Profile JSON

| Field                   | Type     | Purpose                                                 |
| ----------------------- | -------- | ------------------------------------------------------- |
| `profile_id`            | string   | Stable id, must match the filename without `.json`.     |
| `label`                 | string   | Human-readable label for MCP clients.                   |
| `group_type`            | string   | Optional metadata (`cg`, `wg`, `bg`, ...).              |
| `allowed_statuses`      | string[] | Permitted `specStatus` values (e.g. `["CG-DRAFT", "CG-FINAL"]`). |
| `default_status`        | string   | Status used when the client does not specify one.       |
| `repo_metadata_source`  | string   | Optional path to `w3c.json` (used for group id / repo-type checks). |
| `source_root`           | string   | Profile-specific source root (overrides repo default).  |
| `build_root`            | string   | Profile-specific build root.                            |
| `default_source`        | string   | Path to the source document (e.g. `reports/source/index.html`). |
| `status_templates`      | object   | Map of `status` → template path.                        |
| `template_path`         | string   | Fallback template if `status_templates` has no entry.   |
| `respec_defaults`       | object   | Template variables merged under `template_defaults` and above request overrides. |
| `required_sections`     | string[] | Section headings that must exist (matched against `<h1>..<h6>` text). |
| `required_links`        | string[] | Anchor hrefs that must appear in the document.          |
| `forbidden_phrases`     | string[] | Phrases that must not appear in visible text (word-boundary match). |

## Template variables and merge order

Variables are merged left-to-right, later sources winning:

1. Built-in defaults (title, publishDate, editors, ...).
2. `respec-mcp.config.json` → `template_defaults`.
3. Profile → `respec_defaults`.
4. Tool-call → `overrides`.

Keys named `__proto__`, `constructor`, and `prototype` are removed at every
step.

For every key `foo`, a mirror `fooJson` is also exposed containing
`JSON.stringify(foo)`. This is convenient for embedding into ReSpec
`respecConfig` blocks:

```html
<script class="remove">
  var respecConfig = {
    specStatus: {{specStatusJson}},
    editors: {{editorsJson}},
  };
</script>
```

## Placeholder syntax

Placeholders are `{{ key }}` or `{{ key.nested.value }}`. Missing keys render
as an empty string.

Prototype chain access (`__proto__.something`) is blocked.

## Validation behaviour

- `required_sections`: headings compared case-insensitively after whitespace
  collapse. Matching is against `<h1>..<h6>` text content — not against the raw
  HTML — so the word "Introduction" appearing in a paragraph does not satisfy a
  required `Introduction` heading.
- `required_links`: compared against `<a href="...">` values extracted from
  the DOM.
- `forbidden_phrases`: searched in visible text content (scripts, styles,
  templates, and noscript blocks are stripped) with word-boundary matching, so
  `"commit"` does not match `"uncommittable"`.
