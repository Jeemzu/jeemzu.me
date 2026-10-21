import { escapeMarkdown, type ImportImages } from "./importDocument";

export async function htmlMarkdown(
  source: string,
  images: ImportImages,
  warnings: string[],
): Promise<string> {
  // A template is inert: imported scripts, frames and image URLs are never loaded.
  const template = document.createElement("template");
  template.innerHTML = source;
  const root = template.content;
  const ignored = root.querySelectorAll(
    "script,style,iframe,object,embed,link,meta,head,form,svg,canvas,video,audio",
  );
  if (ignored.length) {
    warnings.push(
      "Active content and unsupported media were excluded from the HTML.",
    );
    ignored.forEach((node) => node.remove());
  }
  for (const image of root.querySelectorAll("img")) {
    const src = image.getAttribute("src") ?? "";
    if (Object.prototype.hasOwnProperty.call(images.assets, src)) continue;
    const match =
      /^data:(image\/(?:png|jpeg|gif|webp|bmp));base64,([\s\S]+)$/i.exec(src);
    if (!match)
      throw new Error(
        "HTML images must be embedded data images. Embed local/remote images before importing.",
      );
    let bytes: Uint8Array;
    try {
      const data = atob(match[2].replace(/\s/g, ""));
      bytes = Uint8Array.from(data, (char) => char.charCodeAt(0));
    } catch {
      throw new Error("The HTML contains an invalid base64 image.");
    }
    image.setAttribute(
      "src",
      await images.addRaster(bytes, match[1].toLowerCase()),
    );
  }

  function children(node: Node): string {
    return [...node.childNodes].map(convert).join("");
  }

  function convert(node: Node): string {
    if (node.nodeType === 3)
      return escapeMarkdown((node.textContent ?? "").replace(/\s+/g, " "));
    if (!(node instanceof Element)) return children(node);
    const content = () => children(node).trim();
    switch (node.tagName.toLowerCase()) {
      case "h1":
      case "h2":
      case "h3":
      case "h4":
      case "h5":
      case "h6":
        return `\n\n${"#".repeat(Number(node.tagName[1]))} ${content()}\n\n`;
      case "p":
      case "div":
      case "section":
      case "article":
      case "header":
      case "footer":
      case "figure":
      case "figcaption":
        return `\n\n${content()}\n\n`;
      case "strong":
      case "b":
        return `**${content()}**`;
      case "em":
      case "i":
        return `*${content()}*`;
      case "s":
      case "del":
        return `~~${content()}~~`;
      case "br":
        return "  \n";
      case "hr":
        return "\n\n---\n\n";
      case "a": {
        const href = node.getAttribute("href") ?? "";
        if (!/^https?:\/\//i.test(href)) {
          warnings.push("Non-HTTP links were converted to plain text.");
          return content();
        }
        return `[${content()}](${href.replace(/[\s()<>]/g, encodeURIComponent)})`;
      }
      case "img": {
        const caption =
          node.getAttribute("alt")?.trim() ||
          node.getAttribute("title")?.trim() ||
          "Imported reference";
        return `\n\n![${escapeMarkdown(caption)}](${node.getAttribute("src")})\n\n`;
      }
      case "ul":
      case "ol": {
        const ordered = node.tagName === "OL";
        const start = Number(node.getAttribute("start") ?? 1);
        const items = [...node.children].filter(
          (entry) => entry.tagName === "LI",
        );
        return `\n\n${items
          .map((item, index) => {
            const lines = children(item).trim().split("\n");
            const marker = ordered ? `${start + index}. ` : "- ";
            return `${marker}${lines[0]}\n${lines
              .slice(1)
              .map((line) =>
                line ? `${" ".repeat(marker.length)}${line}` : "",
              )
              .join("\n")}`.trimEnd();
          })
          .join("\n")}\n\n`;
      }
      case "pre": {
        const text = (node.textContent ?? "").replace(/\r\n/g, "\n").trim();
        if (/```/.test(text))
          throw new Error(
            "Code containing triple backticks must be edited before import.",
          );
        return `\n\n\`\`\`\n${text}\n\`\`\`\n\n`;
      }
      case "code":
        return `\`${(node.textContent ?? "").replace(/`/g, "'")}\``;
      case "blockquote":
        return `\n\n${content()
          .split("\n")
          .map((line) => `> ${line}`)
          .join("\n")}\n\n`;
      case "table": {
        if (node.querySelector("table"))
          throw new Error("Nested HTML tables are not supported.");
        const rows = [...node.querySelectorAll("tr")].map((row) =>
          [...row.children].map((cell) => {
            if (
              (cell.getAttribute("colspan") ?? "1") !== "1" ||
              (cell.getAttribute("rowspan") ?? "1") !== "1" ||
              cell.querySelector("img,ul,ol")
            )
              throw new Error(
                "Flatten merged cells, lists, and images in tables before importing.",
              );
            return children(cell).replace(/\s+/g, " ").trim();
          }),
        );
        if (!rows.length) return "";
        const width = rows[0].length;
        if (!width || rows.some((row) => row.length !== width))
          throw new Error(
            "HTML tables must have the same number of cells per row.",
          );
        return `\n\n${[rows[0], Array<string>(width).fill("---"), ...rows.slice(1)].map((row) => `| ${row.join(" | ")} |`).join("\n")}\n\n`;
      }
      default:
        return children(node);
    }
  }
  return children(root)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
