import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { toHTML } from "respec/tools/respecDocWriter.js";
import {
  CONFIG_FILENAME,
  DEFAULT_BUILD_ROOT,
  DEFAULT_SOURCE_ROOT,
  DEFAULT_STATUS,
  ensureStatusAllowed,
  fileExists,
  loadJson,
  loadProfiles,
  loadRepoConfig,
} from "./config.js";
import { checkCompliance } from "./compliance.js";
import { resolveWithinRoot, safeMerge, sanitizeOverrides } from "./security.js";
import { readSourceText, resolveSource } from "./source.js";
import { applyTemplate, withJsonMirrors } from "./template.js";

export const AUTHORING_GUIDE_FILENAME = "AUTHORING_GUIDE.md";

export async function listProfiles(repoRoot) {
  const repoState = await loadRepoConfig(repoRoot);
  const profiles = await loadProfiles(repoState);
  return {
    repo_root: repoState.repoRoot,
    config_path: repoState.configPath,
    default_profile: repoState.config.default_profile || null,
    profiles: profiles.map(profile => ({
      profile_id: profile.profile_id,
      label: profile.label || profile.profile_id,
      allowed_statuses: profile.allowed_statuses || [],
      default_status: profile.default_status || DEFAULT_STATUS,
      repo_metadata_source: profile.repo_metadata_source || null,
    })),
  };
}

export async function scaffoldSource(input, options = {}) {
  const state = await resolveContext(input, options);
  const metadata = await loadRepoMetadata(
    state.repoRoot,
    state.profile.repo_metadata_source
  );

  const sourcePath = resolveScaffoldPath(state, input.output);
  const templatePath = resolveTemplatePath(state.profile, state.status, state.repoRoot);
  const templateText = await readFile(templatePath, "utf-8");
  const rendered = applyTemplate(
    templateText,
    buildTemplateContext(state, metadata, input.overrides)
  );
  await mkdir(path.dirname(sourcePath), { recursive: true });
  await writeFile(sourcePath, rendered, "utf-8");

  const compliance = checkCompliance({
    html: rendered,
    sourceText: rendered,
    profile: state.profile,
  });

  return {
    source: sourcePath,
    output: sourcePath,
    status: state.status,
    errors: [],
    warnings: [],
    compliance: buildComplianceReport(compliance, state, [], []),
    resolved_profile: summarizeProfile(state.profile),
    resolved_repo_config: summarizeRepoConfig(state.repoState),
  };
}

export async function preflightSpec(input, options = {}) {
  const state = await resolveContext(input, options);
  const sourceRef =
    input.source || state.profile.default_source || joinIfPresent(
      state.repoState.config.source_root,
      "index.html"
    );
  if (!sourceRef) {
    throw new Error(
      `No source was provided and profile "${state.profile.profile_id}" has no default_source.`
    );
  }

  const { absolutePath, fileUrl } = resolveSource(state.repoRoot, sourceRef);
  const sourceText = await readSourceText(absolutePath);

  const compliance = checkCompliance({
    html: "",
    sourceText,
    profile: state.profile,
  });

  return {
    source: fileUrl,
    output: null,
    status: state.status,
    rendered: false,
    errors: [],
    warnings: [],
    compliance: buildComplianceReport(compliance, state, [], []),
    resolved_profile: summarizeProfile(state.profile),
    resolved_repo_config: summarizeRepoConfig(state.repoState),
  };
}

export async function validateSpec(input, options = {}) {
  return renderAndAssess(input, options, { writeOutput: false });
}

export async function buildSpec(input, options = {}) {
  return renderAndAssess(input, options, { writeOutput: true });
}

async function renderAndAssess(input, options, behavior) {
  const state = await resolveContext(input, options);
  const sourceRef =
    input.source || state.profile.default_source || joinIfPresent(
      state.repoState.config.source_root,
      "index.html"
    );
  if (!sourceRef) {
    throw new Error(
      `No source was provided and profile "${state.profile.profile_id}" has no default_source.`
    );
  }

  const { absolutePath, fileUrl } = resolveSource(state.repoRoot, sourceRef);
  const sourceText = await readSourceText(absolutePath);
  const outputPath = behavior.writeOutput
    ? resolveOutputPath(state, input.output, absolutePath)
    : null;

  const errors = [];
  const warnings = [];
  const { html, errors: rsErrors = [], warnings: rsWarnings = [] } = await toHTML(
    fileUrl,
    {
      timeout: options.timeout || 300000,
      useLocal: options.useLocal !== false,
      disableSandbox: Boolean(options.disableSandbox),
      disableGPU: Boolean(options.disableGPU),
      devtools: Boolean(options.devtools),
      onError: error => errors.push(sanitizeReSpecError(error)),
      onWarning: warning => warnings.push(sanitizeReSpecError(warning)),
    }
  );

  if (!errors.length && rsErrors.length) {
    errors.push(...rsErrors.map(sanitizeReSpecError));
  }
  if (!warnings.length && rsWarnings.length) {
    warnings.push(...rsWarnings.map(sanitizeReSpecError));
  }

  const compliance = checkCompliance({
    html,
    sourceText,
    profile: state.profile,
  });

  if (outputPath) {
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, html, "utf-8");
  }

  return {
    source: fileUrl,
    output: outputPath,
    status: state.status,
    rendered: true,
    errors,
    warnings,
    compliance: buildComplianceReport(compliance, state, errors, warnings),
    resolved_profile: summarizeProfile(state.profile),
    resolved_repo_config: summarizeRepoConfig(state.repoState),
  };
}

async function resolveContext(input, options) {
  const repoRoot = options.repoRoot;
  if (!repoRoot) {
    throw new Error("repoRoot is not configured; start the server with --repo-root.");
  }

  const repoState = await loadRepoConfig(repoRoot);
  const profiles = await loadProfiles(repoState);
  const profileId =
    input.profile ||
    options.defaultProfile ||
    repoState.config.default_profile ||
    profiles[0]?.profile_id;

  if (!profileId) {
    throw new Error(
      `No profiles are configured for ${repoRoot}. Add ${CONFIG_FILENAME} and a profile JSON file.`
    );
  }

  const profile = profiles.find(item => item.profile_id === profileId);
  if (!profile) {
    const available = profiles.map(p => p.profile_id).join(", ") || "(none)";
    throw new Error(
      `Profile "${profileId}" was not found under ${repoRoot}. Available: ${available}`
    );
  }

  const status =
    input.status ||
    profile.default_status ||
    repoState.config.default_status ||
    DEFAULT_STATUS;
  ensureStatusAllowed(profile, status);

  return { repoRoot, repoState, profile, status };
}

async function loadRepoMetadata(repoRoot, metadataSource) {
  if (!metadataSource) {
    return { found: false, path: null, groupId: null, repoType: null };
  }
  const metadataPath = resolveWithinRoot(repoRoot, metadataSource);
  if (!(await fileExists(metadataPath))) {
    return { found: false, path: metadataPath, groupId: null, repoType: null };
  }
  const metadata = await loadJson(metadataPath);
  return {
    found: true,
    path: metadataPath,
    groupId: Array.isArray(metadata.group) ? metadata.group[0] : null,
    repoType: metadata["repo-type"] || null,
  };
}

function resolveScaffoldPath(state, output) {
  if (output) {
    return resolveWithinRoot(state.repoRoot, output);
  }
  const relative =
    state.profile.default_source ||
    path.join(
      state.repoState.config.source_root || DEFAULT_SOURCE_ROOT,
      "index.html"
    );
  return resolveWithinRoot(state.repoRoot, relative);
}

function resolveTemplatePath(profile, status, repoRoot) {
  const byStatus = profile.status_templates || {};
  const templatePath = byStatus[status] || profile.template_path;
  if (!templatePath) {
    throw new Error(
      `Profile "${profile.profile_id}" does not define a template for status "${status}".`
    );
  }
  return resolveWithinRoot(repoRoot, templatePath);
}

function resolveOutputPath(state, explicitOutput, absoluteSource) {
  if (explicitOutput) {
    return resolveWithinRoot(state.repoRoot, explicitOutput);
  }

  const buildRoot =
    state.profile.build_root ||
    state.repoState.config.build_root ||
    DEFAULT_BUILD_ROOT;
  const sourceRoot =
    state.profile.source_root ||
    state.repoState.config.source_root ||
    DEFAULT_SOURCE_ROOT;

  const absoluteBuildRoot = resolveWithinRoot(state.repoRoot, buildRoot);
  const absoluteSourceRoot = resolveWithinRoot(state.repoRoot, sourceRoot);

  if (absoluteSource.startsWith(`${absoluteSourceRoot}${path.sep}`)) {
    const relative = path.relative(absoluteSourceRoot, absoluteSource);
    return resolveWithinRoot(state.repoRoot, path.join(buildRoot, relative));
  }
  return resolveWithinRoot(
    state.repoRoot,
    path.join(buildRoot, path.basename(absoluteSource))
  );
}

function buildTemplateContext(state, metadata, rawOverrides) {
  const repoDefaults = state.repoState.config.template_defaults || {};
  const profileDefaults = state.profile.respec_defaults || {};
  const overrides = sanitizeOverrides(rawOverrides);

  const merged = safeMerge(
    {
      title: "Untitled Community Group Report",
      subtitle: "",
      shortName: "spec",
      group: null,
      github: null,
      latestVersion: null,
      editors: [],
      publishDate: new Date().toISOString().slice(0, 10),
      specStatus: state.status,
      groupId: metadata.groupId,
      repoType: metadata.repoType,
    },
    repoDefaults,
    profileDefaults,
    overrides
  );

  return withJsonMirrors(merged);
}

function buildComplianceReport(compliance, state, errors, warnings) {
  const profile = state.profile;
  return {
    valid:
      !errors.length &&
      !compliance.required_sections_missing.length &&
      !compliance.required_links_missing.length &&
      !compliance.forbidden_phrase_hits.length,
    status_allowed:
      !profile.allowed_statuses ||
      !profile.allowed_statuses.length ||
      profile.allowed_statuses.includes(state.status),
    required_sections_missing: compliance.required_sections_missing,
    required_links_missing: compliance.required_links_missing,
    forbidden_phrase_hits: compliance.forbidden_phrase_hits,
    warnings_count: warnings.length,
    errors_count: errors.length,
  };
}

function sanitizeReSpecError(error) {
  return {
    message: error.message,
    plugin: error.plugin || null,
    hint: error.hint || null,
  };
}

function summarizeProfile(profile) {
  return {
    profile_id: profile.profile_id,
    label: profile.label || profile.profile_id,
    allowed_statuses: profile.allowed_statuses || [],
    default_status: profile.default_status || DEFAULT_STATUS,
    source_root: profile.source_root || null,
    build_root: profile.build_root || null,
    repo_metadata_source: profile.repo_metadata_source || null,
  };
}

function summarizeRepoConfig(repoState) {
  return {
    repo_root: repoState.repoRoot,
    config_path: repoState.configPath,
    default_profile: repoState.config.default_profile || null,
    source_root: repoState.config.source_root || DEFAULT_SOURCE_ROOT,
    build_root: repoState.config.build_root || DEFAULT_BUILD_ROOT,
  };
}

function joinIfPresent(root, leaf) {
  return root ? path.join(root, leaf) : null;
}
