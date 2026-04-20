import { parseHTML } from "linkedom";

const HEADING_SELECTOR = "h1, h2, h3, h4, h5, h6";

export function checkCompliance({ html, sourceText, profile }) {
  const { required_sections = [], required_links = [], forbidden_phrases = [] } =
    profile;

  const renderedReport = analyze(html || "");
  const sourceReport = analyze(sourceText || "");

  const requiredSectionsMissing = required_sections.filter(section => {
    const normalized = normalize(section);
    return !renderedReport.headingsNormalized.has(normalized);
  });

  const requiredLinksMissing = required_links.filter(link => {
    if (renderedReport.linkHrefs.has(link)) return false;
    return !sourceReport.linkHrefs.has(link);
  });

  const forbiddenPhraseHits = [];
  for (const phrase of forbidden_phrases) {
    const normalizedPhrase = phrase.toLowerCase();
    if (!normalizedPhrase) continue;
    const hitsInRendered = containsPhrase(renderedReport.visibleText, normalizedPhrase);
    const hitsInSource = containsPhrase(sourceReport.visibleText, normalizedPhrase);
    if (hitsInRendered || hitsInSource) {
      forbiddenPhraseHits.push(phrase);
    }
  }

  return {
    required_sections_missing: requiredSectionsMissing,
    required_links_missing: requiredLinksMissing,
    forbidden_phrase_hits: forbiddenPhraseHits,
  };
}

function analyze(html) {
  if (!html) {
    return {
      headingsNormalized: new Set(),
      linkHrefs: new Set(),
      visibleText: "",
    };
  }

  const { document } = parseHTML(html);

  for (const element of document.querySelectorAll("script, style, template, noscript")) {
    element.remove();
  }

  const headingsNormalized = new Set();
  for (const heading of document.querySelectorAll(HEADING_SELECTOR)) {
    const clone = heading.cloneNode(true);
    for (const noise of clone.querySelectorAll(".secno, .self-link, .permalink")) {
      noise.remove();
    }
    const text = normalize(clone.textContent || "");
    if (text) headingsNormalized.add(text);
  }

  const linkHrefs = new Set();
  for (const anchor of document.querySelectorAll("a[href]")) {
    const href = anchor.getAttribute("href");
    if (href) linkHrefs.add(href);
  }

  const textSource =
    document.body?.textContent ||
    document.documentElement?.textContent ||
    document.textContent ||
    "";
  const visibleText = textSource.replace(/\s+/g, " ").toLowerCase();

  return {
    headingsNormalized,
    linkHrefs,
    visibleText,
  };
}

function normalize(text) {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

function containsPhrase(haystack, needle) {
  if (!needle || !haystack) return false;
  let from = 0;
  while (true) {
    const index = haystack.indexOf(needle, from);
    if (index === -1) return false;
    const left = index === 0 ? "" : haystack.charAt(index - 1);
    const right = haystack.charAt(index + needle.length);
    if (isBoundary(left) && isBoundary(right)) return true;
    from = index + 1;
  }
}

function isBoundary(char) {
  if (!char) return true;
  return !/\w/.test(char);
}
