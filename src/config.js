import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { resolveWithinRoot } from "./security.js";

export const CONFIG_FILENAME = "respec-mcp.config.json";
export const DEFAULT_STATUS = "CG-DRAFT";
export const DEFAULT_SOURCE_ROOT = "reports/source";
export const DEFAULT_BUILD_ROOT = "reports/build";
export const DEFAULT_PROFILE_DIRECTORY = "respec-mcp/profiles";

export async function loadJson(filePath) {
  const source = await readFile(filePath, "utf-8");
  return JSON.parse(source);
}

export async function fileExists(filePath) {
  try {
    await readFile(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function loadRepoConfig(repoRoot) {
  const absoluteRoot = path.resolve(repoRoot);
  const configPath = path.join(absoluteRoot, CONFIG_FILENAME);
  const hasConfig = await fileExists(configPath);
  const repoConfig = hasConfig
    ? await loadJson(configPath)
    : {
        default_profile: null,
        profile_directory: DEFAULT_PROFILE_DIRECTORY,
        source_root: DEFAULT_SOURCE_ROOT,
        build_root: DEFAULT_BUILD_ROOT,
      };

  return {
    repoRoot: absoluteRoot,
    configPath: hasConfig ? configPath : null,
    config: repoConfig,
  };
}

export async function loadProfiles(repoState) {
  const config = repoState.config;
  const configuredPaths = Array.isArray(config.profile_paths)
    ? config.profile_paths
    : null;

  const profilePaths = configuredPaths
    ? configuredPaths
    : await discoverProfiles(
        repoState.repoRoot,
        config.profile_directory || DEFAULT_PROFILE_DIRECTORY
      );

  const loaded = [];
  for (const relative of profilePaths) {
    const absolute = resolveWithinRoot(repoState.repoRoot, relative);
    const profile = await loadJson(absolute);
    loaded.push({ ...profile, __path: absolute });
  }
  return loaded;
}

async function discoverProfiles(repoRoot, profileDirectory) {
  const directory = resolveWithinRoot(repoRoot, profileDirectory);
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    return entries
      .filter(entry => entry.isFile() && entry.name.endsWith(".json"))
      .map(entry => path.join(profileDirectory, entry.name))
      .sort();
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

export function ensureStatusAllowed(profile, status) {
  const allowed = profile.allowed_statuses || [];
  if (allowed.length && !allowed.includes(status)) {
    throw new Error(
      `Status "${status}" is not allowed for profile "${profile.profile_id}". ` +
        `Allowed: ${allowed.join(", ")}`
    );
  }
}
