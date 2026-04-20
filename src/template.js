const PROTOTYPE_KEYS = new Set(["__proto__", "constructor", "prototype"]);

export function applyTemplate(template, values) {
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_match, expression) => {
    const resolved = lookup(values, expression);
    if (resolved === undefined || resolved === null) {
      return "";
    }
    return String(resolved);
  });
}

export function withJsonMirrors(values) {
  const mirrored = {};
  for (const [key, value] of Object.entries(values)) {
    mirrored[key] = value;
    mirrored[`${key}Json`] = JSON.stringify(value);
  }
  return mirrored;
}

function lookup(root, expression) {
  const segments = expression.split(".");
  let current = root;
  for (const segment of segments) {
    if (PROTOTYPE_KEYS.has(segment)) return undefined;
    if (current === null || current === undefined) return undefined;
    if (typeof current !== "object") return undefined;
    if (!Object.prototype.hasOwnProperty.call(current, segment)) return undefined;
    current = current[segment];
  }
  return current;
}
