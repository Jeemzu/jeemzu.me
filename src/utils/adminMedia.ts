export interface MediaType {
  kind: "image" | "video";
  mime: string;
}

const imageTypes: Record<string, string> = {
  apng: "image/apng",
  avif: "image/avif",
  bmp: "image/bmp",
  gif: "image/gif",
  ico: "image/x-icon",
  jfif: "image/jpeg",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  png: "image/png",
  svg: "image/svg+xml",
  webp: "image/webp",
};

const videoTypes: Record<string, string> = {
  m4v: "video/mp4",
  mov: "video/quicktime",
  mp4: "video/mp4",
  ogg: "video/ogg",
  ogv: "video/ogg",
  webm: "video/webm",
};

export function getMediaType(name: string): MediaType | null {
  const extension = name.match(/\.([^.]+)$/)?.[1].toLowerCase();
  if (!extension) return null;
  if (Object.prototype.hasOwnProperty.call(imageTypes, extension))
    return { kind: "image", mime: imageTypes[extension] };
  if (Object.prototype.hasOwnProperty.call(videoTypes, extension))
    return { kind: "video", mime: videoTypes[extension] };
  return null;
}
