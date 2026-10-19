import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  AUTHORING_GUIDE_FILENAME,
  buildSpec,
  getProfile,
  listProfiles,
  preflightSpec,
  scaffoldSource,
  validateSpec,
} from "./core.js";
import { listSkills, readSkill } from "./skills.js";

const docsDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "docs"
);

const baseInput = {
  profile: z.string().optional(),
  status: z.string().optional(),
  overrides: z.record(z.any()).optional(),
};

const renderInput = {
  ...baseInput,
  source: z.string().optional(),
  output: z.string().optional(),
};

export function createReSpecMcpServer(options = {}) {
  if (!options.repoRoot) {
    throw new Error("createReSpecMcpServer requires options.repoRoot.");
  }

  const server = new McpServer({
    name: "respec-mcp",
    version: options.version || "0.2.0",
  });

  const toolOptions = {
    repoRoot: path.resolve(options.repoRoot),
    defaultProfile: options.defaultProfile,
    timeout: options.timeout,
    useLocal: options.useLocal !== false,
    disableSandbox: Boolean(options.disableSandbox),
    disableGPU: Boolean(options.disableGPU),
    devtools: Boolean(options.devtools),
  };

  server.registerTool(
    "respec_list_profiles",
    {
      title: "List ReSpec MCP Profiles",
      description:
        "Lists repo-local ReSpec MCP profiles discovered from respec-mcp.config.json " +
        "and respec-mcp/profiles/*.json.",
      inputSchema: {},
    },
    async () => formatResult(await listProfiles(toolOptions.repoRoot))
  );

  server.registerTool(
    "respec_scaffold",
    {
      title: "Scaffold ReSpec Source",
      description:
        "Creates a ReSpec source document from a repo-local profile and " +
        "status-specific template. Paths must stay within the configured repo root. " +
        "For authoring, read respec-mcp://skills and the relevant skill; authors may explain in their own language.",
      inputSchema: renderInput,
    },
    async input => formatResult(await scaffoldSource(input, toolOptions))
  );

  server.registerTool(
    "respec_preflight",
    {
      title: "Preflight ReSpec Source (source-only, no render)",
      description:
        "Fast policy checks against the source file without rendering: required " +
        "sections, required links, forbidden phrases, allowed statuses. Use this " +
        "before edits to catch policy violations cheaply.",
      inputSchema: renderInput,
    },
    async input => formatResult(await preflightSpec(input, toolOptions))
  );

  server.registerTool(
    "respec_validate",
    {
      title: "Validate ReSpec Document (full render, no write)",
      description:
        "Runs ReSpec rendering via Puppeteer and returns render diagnostics plus " +
        "post-render compliance results. Does not write output.",
      inputSchema: renderInput,
    },
    async input => formatResult(await validateSpec(input, toolOptions))
  );

  server.registerTool(
    "respec_build",
    {
      title: "Build ReSpec Document",
      description:
        "Renders a ReSpec source file to static HTML using the resolved repo-local " +
        "profile, writes the output, and returns compliance results.",
      inputSchema: renderInput,
    },
    async input => formatResult(await buildSpec(input, toolOptions))
  );

  server.registerResource(
    "authoring-guide",
    "respec-mcp://authoring-guide",
    {
      title: "ReSpec MCP Human-Led Authoring Guide",
      description:
        "Human-led editorial guidance, including optional native-language discussion and faithful English drafting.",
      mimeType: "text/markdown",
    },
    async uri => {
      const text = await readFile(
        path.join(docsDir, AUTHORING_GUIDE_FILENAME),
        "utf-8"
      );
      const principles = await readFile(path.join(docsDir, "EDITORIAL_PRINCIPLES.md"), "utf-8");
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "text/markdown",
            text: `${principles}\n\n${text}`,
          },
        ],
      };
    }
  );

  server.registerResource(
    "profile",
    new ResourceTemplate("respec-mcp://profile/{profile_id}", {
      list: async () => {
        const result = await listProfiles(toolOptions.repoRoot);
        return {
          resources: result.profiles.map(profile => ({
            uri: `respec-mcp://profile/${profile.profile_id}`,
            name: profile.label,
            mimeType: "application/json",
          })),
        };
      },
    }),
    {
      title: "ReSpec MCP Profile",
      description: "Repo-local profile JSON exposed for MCP client inspection.",
      mimeType: "application/json",
    },
    async (uri, { profile_id }) => {
      const profile = await getProfile(toolOptions.repoRoot, profile_id);
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(profile, null, 2),
          },
        ],
      };
    }
  );

  server.registerResource("document-skills", "respec-mcp://skills", {
    title: "W3C document skills and tool routing",
    description: "Choose guidance for explainers, reports, reviews, charters, publication, meeting records and presentations. Guidance is separate from automated validation.",
    mimeType: "application/json",
  }, async uri => ({ contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(await listSkills(), null, 2) }] }));

  server.registerResource("document-skill", new ResourceTemplate("respec-mcp://skill/{skill_id}", {
    list: async () => ({ resources: (await listSkills()).skills.map(skill => ({
      uri: `respec-mcp://skill/${skill.id}`, name: skill.title,
      description: skill.description, mimeType: "text/markdown",
    })) }),
  }), { title: "W3C document skill", mimeType: "text/markdown" },
  async (uri, { skill_id }) => ({ contents: [{ uri: uri.href, mimeType: "text/markdown", text: await readSkill(skill_id) }] }));

  return server;
}

function formatResult(result) {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(result, null, 2),
      },
    ],
    structuredContent: result,
  };
}
