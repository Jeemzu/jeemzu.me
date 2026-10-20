import { useEffect } from "react";
import { useLocation } from "wouter";
import routeMetadata from "../../lib/routeMetadata.json";

interface Metadata {
  title: string;
  description: string;
}

const metadataByPath: Readonly<Record<string, Metadata>> = routeMetadata;
const notFoundMetadata: Metadata = {
  title: "Page Not Found",
  description: "The requested page could not be found on jeemzu.me.",
};

export default function RouteMetadata() {
  const [location] = useLocation();
  const pathname = location.replace(/\/+$/, "") || "/";
  const metadata = Object.prototype.hasOwnProperty.call(metadataByPath, pathname)
    ? metadataByPath[pathname]
    : notFoundMetadata;

  useEffect(() => {
    document.title = metadata.title;
    const tags = [
      ["name", "description", metadata.description],
      ["property", "og:title", metadata.title],
      ["property", "og:description", metadata.description],
      ["name", "twitter:title", metadata.title],
      ["name", "twitter:description", metadata.description],
    ];

    for (const [attribute, key, content] of tags) {
      const selector = `meta[${attribute}="${key}"]`;
      let tag = document.head.querySelector<HTMLMetaElement>(selector);
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute(attribute, key);
        document.head.appendChild(tag);
      }
      tag.content = content;
    }
  }, [metadata]);

  return null;
}
