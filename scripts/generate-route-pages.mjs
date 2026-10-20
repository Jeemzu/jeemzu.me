import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const outputDirectory = join(process.cwd(), "dist");
const sourcePath = join(outputDirectory, "index.html");
const metadataPath = join(process.cwd(), "src", "lib", "routeMetadata.json");
const metadataByPath = JSON.parse(await readFile(metadataPath, "utf8"));
const template = await readFile(sourcePath, "utf8");

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[character];
  });
}

function updateMetaContent(html, attribute, key, value) {
  const tagPattern = new RegExp(
    `<meta\\b(?=[^>]*\\b${attribute}="${key}")[^>]*>`,
    "g",
  );
  let matches = 0;
  const updatedHtml = html.replace(tagPattern, (tag) => {
    matches += 1;
    return tag.replace(/\bcontent="[^"]*"/, () => `content="${escapeHtml(value)}"`);
  });

  if (matches !== 1) {
    throw new Error(`Expected one ${attribute} metadata tag; found ${matches}.`);
  }

  return updatedHtml;
}

for (const [pathname, metadata] of Object.entries(metadataByPath)) {
  if (!pathname.startsWith("/") || pathname.includes("..")) {
    throw new Error(`Invalid metadata route: ${pathname}`);
  }
  if (!metadata.title?.trim() || !metadata.description?.trim()) {
    throw new Error(`Missing title or description for ${pathname}`);
  }
  let html = template.replace(
    /<title>[\s\S]*?<\/title>/,
    () => `<title>${escapeHtml(metadata.title)}</title>`,
  );
  html = updateMetaContent(html, "name", "description", metadata.description);
  html = updateMetaContent(html, "property", "og:description", metadata.description);
  html = updateMetaContent(html, "property", "og:title", metadata.title);
  html = updateMetaContent(html, "name", "twitter:title", metadata.title);
  html = updateMetaContent(html, "name", "twitter:description", metadata.description);

  const routePath = join(outputDirectory, pathname.slice(1), "index.html");
  await mkdir(dirname(routePath), { recursive: true });
  await writeFile(routePath, html);
}

console.log(`Generated page metadata for ${Object.keys(metadataByPath).length} routes.`);
