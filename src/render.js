import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parseHTML } from "linkedom";
import { toHTML } from "respec/tools/respecDocWriter.js";
import { resolveWithinRoot } from "./security.js";

const require = createRequire(import.meta.url);
const builds = path.join(path.dirname(require.resolve("respec/package.json")), "builds");
const MIME = { ".js": "application/javascript", ".css": "text/css", ".html": "text/html", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg" };

export async function renderDocument({ repoRoot, absolutePath, sourceText }, options) {
  if (options.useLocal === false) return toHTML(pathToFileURL(absolutePath).href, options);
  // Serve the locked bundle and its worker/highlighter from the same origin.
  // Upstream's script interception alone misses fetches from the worker loader.
  const assetPrefix = `/__respec_mcp_${randomUUID()}/`;
  const { document } = parseHTML(sourceText);
  for (const script of document.querySelectorAll("script[src]")) {
    const src = script.getAttribute("src");
    const match = src.match(/\/(respec-[\w-]+)(?:\.js)?(?:[?#].*)?$/);
    if (match) script.setAttribute("src", `${assetPrefix}${match[1]}.js`);
  }
  const sourceUrl = "/" + path.relative(repoRoot, absolutePath).split(path.sep).map(encodeURIComponent).join("/");
  const server = createServer(async (request, response) => {
    try {
      if (request.method !== "GET") { response.writeHead(405).end(); return; }
      const pathname = new URL(request.url, "http://localhost").pathname;
      let bytes, extension;
      if (pathname === sourceUrl) {
        bytes = document.toString(); extension = ".html";
      } else if (pathname.startsWith(assetPrefix)) {
        const name = pathname.slice(assetPrefix.length);
        if (!/^respec-[\w-]+\.js$/.test(name)) { response.writeHead(404).end(); return; }
        bytes = await readFile(path.join(builds, name)); extension = ".js";
      } else {
        const target = resolveWithinRoot(repoRoot, decodeURIComponent(pathname).replace(/^\/+/, ""));
        bytes = await readFile(target); extension = path.extname(target);
      }
      response.writeHead(200, { "Content-Type": MIME[extension] || "application/octet-stream", "Cache-Control": "no-store" }).end(bytes);
    } catch {
      response.writeHead(404).end();
    }
  });
  try {
    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve);
    });
    return await toHTML(`http://127.0.0.1:${server.address().port}${sourceUrl}`, { ...options, useLocal: false });
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
}
