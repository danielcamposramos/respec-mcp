import { readFile } from "node:fs/promises";
import { resolveSourceUrl } from "./security.js";

export function resolveSource(repoRoot, source) {
  return resolveSourceUrl(repoRoot, source);
}

export async function readSourceText(absolutePath) {
  return readFile(absolutePath, "utf-8");
}
