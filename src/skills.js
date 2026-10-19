import { readFile } from "node:fs/promises";

const root = new URL("../skills/", import.meta.url);

export async function listSkills() {
  return JSON.parse(await readFile(new URL("catalog.json", root), "utf8"));
}

export async function readSkill(id) {
  const catalog = await listSkills();
  const entry = catalog.skills.find(skill => skill.id === id);
  if (!entry) throw new Error(`Unknown document skill: ${id}`);
  // Only package-owned catalog entries are paths; user input is never a path.
  const common = await readFile(new URL("../docs/EDITORIAL_PRINCIPLES.md", import.meta.url), "utf8");
  const specific = await readFile(new URL(`${entry.id}/SKILL.md`, root), "utf8");
  return `${specific}\n\n---\n\n${common}`;
}
