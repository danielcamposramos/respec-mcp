import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const PROTOTYPE_KEYS = new Set(["__proto__", "constructor", "prototype"]);

export class SecurityError extends Error {
  constructor(message) {
    super(message);
    this.name = "SecurityError";
  }
}

export function resolveWithinRoot(root, candidate) {
  if (typeof candidate !== "string" || candidate.length === 0) {
    throw new SecurityError("Path is empty.");
  }
  if (candidate.includes("\0")) {
    throw new SecurityError("Path contains a null byte.");
  }

  const absoluteRoot = path.resolve(root);
  const resolved = path.isAbsolute(candidate)
    ? path.resolve(candidate)
    : path.resolve(absoluteRoot, candidate);

  const relative = path.relative(absoluteRoot, resolved);
  if (
    relative === ".." ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  ) {
    throw new SecurityError(
      `Path "${candidate}" resolves outside of the allowed repo root.`
    );
  }

  return resolved;
}

export function resolveSourceUrl(root, source) {
  if (typeof source !== "string" || source.length === 0) {
    throw new SecurityError("Source is empty.");
  }

  let absolute;
  if (source.startsWith("file:")) {
    absolute = fileURLToPath(source);
  } else if (/^[a-z][a-z0-9+.-]*:/i.test(source)) {
    throw new SecurityError(
      `Non-file URL schemes are not permitted for source (received "${source}"). ` +
        "Provide a path relative to the repo root or a file:// URL inside it."
    );
  } else {
    absolute = source;
  }

  const contained = resolveWithinRoot(root, absolute);
  return {
    absolutePath: contained,
    fileUrl: pathToFileURL(contained).href,
  };
}

export function safeMerge(...sources) {
  const out = Object.create(null);
  for (const source of sources) {
    if (!source || typeof source !== "object") continue;
    for (const key of Object.keys(source)) {
      if (PROTOTYPE_KEYS.has(key)) continue;
      out[key] = source[key];
    }
  }
  return out;
}

export function sanitizeOverrides(overrides) {
  if (!overrides || typeof overrides !== "object" || Array.isArray(overrides)) {
    return {};
  }
  const clean = Object.create(null);
  for (const key of Object.keys(overrides)) {
    if (PROTOTYPE_KEYS.has(key)) continue;
    clean[key] = overrides[key];
  }
  return clean;
}
