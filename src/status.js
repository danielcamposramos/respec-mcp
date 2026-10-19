import { parse } from "acorn";
import { parseHTML } from "linkedom";

// Inspect syntax, never evaluate document JavaScript in the Node process.
// Dynamic configuration is deliberately deferred to the rendered export.
export function readSourceStatus(sourceText) {
  const { document } = parseHTML(sourceText);
  const candidates = [];
  for (const script of document.querySelectorAll("script:not([src])")) {
    const type = script.getAttribute("type") || "";
    if (type && !["text/javascript", "application/javascript", "module"].includes(type)) continue;
    let tree;
    try {
      tree = parse(script.textContent, { ecmaVersion: "latest", sourceType: type === "module" ? "module" : "script" });
    } catch {
      return null;
    }
    for (const statement of tree.body) {
      if (statement.type === "VariableDeclaration") {
        for (const declaration of statement.declarations) {
          if (declaration.id.name !== "respecConfig") return null;
          candidates.push(declaration.init);
        }
        continue;
      }
      const expression = statement.expression;
      if (expression?.type === "AssignmentExpression" && expression.operator === "=" && isConfig(expression.left)) {
        candidates.push(expression.right);
      } else if (statement.type !== "EmptyStatement") {
        return null;
      }
    }
  }
  if (candidates.length !== 1 || candidates[0]?.type !== "ObjectExpression") return null;
  let status = null;
  for (const property of candidates[0].properties) {
    // Spreads/computed keys may override specStatus: do not guess.
    if (property.type !== "Property" || property.computed) return null;
    if ((property.key.name || property.key.value) !== "specStatus") continue;
    if (property.kind !== "init" || property.value.type !== "Literal" || typeof property.value.value !== "string") return null;
    status = property.value.value;
  }
  return status;
}

function isConfig(node) {
  return node.type === "Identifier" && node.name === "respecConfig" ||
    node.type === "MemberExpression" && !node.computed &&
    ["window", "globalThis"].includes(node.object.name) && node.property.name === "respecConfig";
}

export function readRenderedStatus(html) {
  const { document } = parseHTML(html);
  const configs = document.querySelectorAll('script#initialUserConfig[type="application/json"]');
  if (configs.length !== 1) return null;
  try {
    const { specStatus } = JSON.parse(configs[0].textContent);
    return typeof specStatus === "string" && specStatus ? specStatus : null;
  } catch {
    return null;
  }
}

export function assessStatus(actual, { profile, requestedStatus }, { rendered = false } = {}) {
  const allowed = profile.allowed_statuses || [];
  const pending = [];
  const errors = [];
  if (!actual) {
    const message = rendered
      ? "Cannot verify specStatus from ReSpec's exported initialUserConfig."
      : "Document specStatus is not a static literal; full validation is required.";
    (rendered ? errors : pending).push(message);
  } else {
    if (allowed.length && !allowed.includes(actual)) {
      errors.push(`Document status "${actual}" is not allowed by profile "${profile.profile_id}" (${allowed.join(", ")}).`);
    }
    if (requestedStatus && requestedStatus !== actual) {
      errors.push(`Document status "${actual}" does not match requested status "${requestedStatus}".`);
    }
  }
  return {
    document_status: actual,
    status_allowed: actual ? !allowed.length || allowed.includes(actual) : null,
    status_errors: errors,
    pending_checks: pending,
  };
}
