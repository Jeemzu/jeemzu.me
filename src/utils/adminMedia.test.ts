import { describe, expect, it } from "vitest";
import { getMediaType } from "./adminMedia";

describe("admin media formats", () => {
  it.each([
    ["photo.JPG", "image/jpeg"],
    ["photo.jpeg", "image/jpeg"],
    ["photo.jfif", "image/jpeg"],
    ["image.png", "image/png"],
    ["image.apng", "image/apng"],
    ["animation.gif", "image/gif"],
    ["image.webp", "image/webp"],
    ["image.avif", "image/avif"],
    ["image.bmp", "image/bmp"],
    ["icon.ico", "image/x-icon"],
    ["drawing.svg", "image/svg+xml"],
  ])("recognizes image %s", (name, mime) => {
    expect(getMediaType(name)).toEqual({ kind: "image", mime });
  });

  it.each([
    ["clip.MP4", "video/mp4"],
    ["clip.m4v", "video/mp4"],
    ["clip.mov", "video/quicktime"],
    ["clip.webm", "video/webm"],
    ["clip.ogv", "video/ogg"],
    ["clip.ogg", "video/ogg"],
  ])("recognizes video %s", (name, mime) => {
    expect(getMediaType(name)).toEqual({ kind: "video", mime });
  });

  it.each([
    "document.pdf", "page.html", "script.js", "image.png.exe",
    "no-extension", "png", "file.", "clip.avi", "clip.mkv",
    "image.tiff", "image.heic", "file.constructor", "file.__proto__", "",
  ])("excludes unsupported file %s", (name) => {
    expect(getMediaType(name)).toBeNull();
  });
});
