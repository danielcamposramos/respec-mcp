import os from "node:os";
import path from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import {
  resolveWithinRoot,
  resolveSourceUrl,
  safeMerge,
  sanitizeOverrides,
  SecurityError,
} from "../../src/security.js";

describe("security.resolveWithinRoot", () => {
  let root;
  beforeAll(async () => {
    root = await mkdtemp(path.join(os.tmpdir(), "respec-mcp-root-"));
  });
  afterAll(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("resolves relative paths inside the root", () => {
    const resolved = resolveWithinRoot(root, "reports/source/index.html");
    expect(resolved).toBe(path.join(root, "reports/source/index.html"));
  });

  it("accepts absolute paths that stay within the root", () => {
    const inside = path.join(root, "a", "b.html");
    expect(resolveWithinRoot(root, inside)).toBe(inside);
  });

  it("rejects parent-traversal paths", () => {
    expect(() => resolveWithinRoot(root, "../../../etc/passwd")).toThrowError(
      SecurityError
    );
  });

  it("rejects absolute paths outside the root", () => {
    expect(() => resolveWithinRoot(root, "/etc/crontab")).toThrowError(SecurityError);
  });

  it("rejects null bytes", () => {
    expect(() => resolveWithinRoot(root, "file\0.txt")).toThrowError(SecurityError);
  });
});

describe("security.resolveSourceUrl", () => {
  let root;
  beforeAll(async () => {
    root = await mkdtemp(path.join(os.tmpdir(), "respec-mcp-src-"));
  });
  afterAll(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("accepts relative paths inside the root", () => {
    const { absolutePath, fileUrl } = resolveSourceUrl(root, "doc.html");
    expect(absolutePath).toBe(path.join(root, "doc.html"));
    expect(fileUrl).toBe(pathToFileURL(absolutePath).href);
  });

  it("accepts file:// URLs inside the root", () => {
    const inside = path.join(root, "doc.html");
    const url = pathToFileURL(inside).href;
    const { absolutePath } = resolveSourceUrl(root, url);
    expect(absolutePath).toBe(inside);
  });

  it("rejects http(s) sources", () => {
    expect(() => resolveSourceUrl(root, "https://evil.example.com/x.html")).toThrowError(
      SecurityError
    );
    expect(() => resolveSourceUrl(root, "http://evil.example.com")).toThrowError(
      SecurityError
    );
  });

  it("rejects file:// URLs outside the root", () => {
    const outside = pathToFileURL("/etc/hosts").href;
    expect(() => resolveSourceUrl(root, outside)).toThrowError(SecurityError);
  });

  it("rejects other schemes", () => {
    expect(() => resolveSourceUrl(root, "data:text/html,<b>x</b>")).toThrowError(
      SecurityError
    );
    expect(() => resolveSourceUrl(root, "javascript:alert(1)")).toThrowError(
      SecurityError
    );
  });
});

describe("security.safeMerge / sanitizeOverrides", () => {
  it("filters __proto__ when merging", () => {
    const malicious = JSON.parse('{"__proto__": {"polluted": true}}');
    const merged = safeMerge({ a: 1 }, malicious);
    expect(merged.polluted).toBeUndefined();
    expect({}.polluted).toBeUndefined();
  });

  it("filters constructor and prototype keys", () => {
    const merged = safeMerge(
      {},
      { constructor: { prototype: { polluted: true } } }
    );
    expect(merged.constructor).toBeUndefined();
    expect(({}).polluted).toBeUndefined();
  });

  it("sanitizeOverrides rejects arrays and non-objects", () => {
    expect(sanitizeOverrides(null)).toEqual({});
    expect(sanitizeOverrides([1, 2, 3])).toEqual({});
    expect(sanitizeOverrides("x")).toEqual({});
  });

  it("sanitizeOverrides strips prototype keys but keeps real keys", () => {
    const raw = JSON.parse('{"__proto__": {"bad": 1}, "title": "ok"}');
    const clean = sanitizeOverrides(raw);
    expect(clean.title).toBe("ok");
    expect(Object.prototype.hasOwnProperty.call(clean, "__proto__")).toBeFalse();
    expect({}.bad).toBeUndefined();
  });
});
