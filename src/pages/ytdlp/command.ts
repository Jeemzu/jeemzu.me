export type Shell = "powershell" | "posix";
export type VideoQuality = "best" | "1080" | "720";
export type AudioQuality = "best" | "320" | "192";

export interface DownloadOptions {
  url: string;
  shell: Shell;
  isPlaylist: boolean;
  mp3Only: boolean;
  videoQuality: VideoQuality;
  audioQuality: AudioQuality;
  subtitles: boolean;
  thumbnail: boolean;
  outputFolder: string;
}

export const DEFAULT_OPTIONS: DownloadOptions = {
  url: "",
  shell: "powershell",
  isPlaylist: false,
  mp3Only: false,
  videoQuality: "best",
  audioQuality: "best",
  subtitles: false,
  thumbnail: false,
  outputFolder: "",
};

type CommandResult =
  | { command: string; error: null }
  | { command: null; error: string; field: "url" | "outputFolder" };

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
  "www.youtu.be",
]);
const VIDEO_ID = /^[a-zA-Z0-9_-]{11}$/;
const CONTROL_CHARACTERS = /[\p{Cc}\u2028\u2029]/u;

export function quoteArgument(value: string, shell: Shell): string {
  return shell === "powershell"
    ? `'${value.replace(/'/g, "''")}'`
    : `'${value.replace(/'/g, "'\"'\"'")}'`;
}

export function buildCommand(options: DownloadOptions): CommandResult {
  const invalidUrl = (error: string): CommandResult => ({
    command: null,
    error,
    field: "url",
  });
  if (!options.url.trim()) return invalidUrl("Enter a YouTube URL.");
  if (CONTROL_CHARACTERS.test(options.url))
    return invalidUrl(
      "The URL must be a single line without control characters.",
    );

  let url: URL;
  try {
    url = new URL(options.url.trim());
  } catch {
    return invalidUrl("Enter a complete YouTube URL, including https://.");
  }
  if (
    !["https:", "http:"].includes(url.protocol) ||
    !YOUTUBE_HOSTS.has(url.hostname) ||
    url.username ||
    url.password ||
    url.port
  )
    return invalidUrl("Use an http(s) youtube.com or youtu.be URL.");

  const segments = url.pathname.split("/").filter(Boolean);
  const isShortHost = url.hostname.endsWith("youtu.be");
  const videoId = isShortHost
    ? segments.length === 1 && segments[0]
    : url.pathname === "/watch"
      ? url.searchParams.get("v")
      : segments.length === 2 &&
        ["shorts", "live", "embed"].includes(segments[0]) &&
        segments[1];
  const hasVideo = typeof videoId === "string" && VIDEO_ID.test(videoId);
  const playlistId = url.searchParams.get("list");
  const hasPlaylist =
    !!playlistId &&
    /^[a-zA-Z0-9_-]+$/.test(playlistId) &&
    (hasVideo || (!isShortHost && url.pathname === "/playlist"));

  if (!hasVideo && !hasPlaylist)
    return invalidUrl(
      "Use a YouTube video, Shorts, live video, or playlist URL.",
    );
  if (options.isPlaylist && !hasPlaylist)
    return invalidUrl(
      "Use a URL containing a playlist (list=), or select Single video.",
    );
  if (!options.isPlaylist && !hasVideo)
    return invalidUrl("Select Playlist, or use a URL containing a video.");

  if (CONTROL_CHARACTERS.test(options.outputFolder))
    return {
      command: null,
      error:
        "The output folder must be a single line without control characters.",
      field: "outputFolder",
    };
  // PowerShell treats smart single quotes as string delimiters, too.
  if (
    options.shell === "powershell" &&
    /[\u2018\u2019]/.test(options.outputFolder)
  )
    return {
      command: null,
      error:
        "Replace curly apostrophes in the folder path with straight apostrophes.",
      field: "outputFolder",
    };

  const quote = (value: string) => quoteArgument(value, options.shell);
  const args = [
    options.shell === "powershell" ? ".\\yt-dlp.exe" : "yt-dlp",
    "--ignore-config",
    "--js-runtimes",
    "node",
    options.isPlaylist ? "--yes-playlist" : "--no-playlist",
    "--no-overwrites",
  ];

  if (options.mp3Only) {
    args.push(
      "--format",
      quote("ba/b"),
      "--extract-audio",
      "--audio-format",
      "mp3",
      "--audio-quality",
      options.audioQuality === "best" ? "0" : `${options.audioQuality}K`,
    );
  } else {
    const cap =
      options.videoQuality === "best"
        ? ""
        : `[height<=${options.videoQuality}]`;
    args.push(
      "--format",
      quote(`bv*${cap}+ba/b${cap}`),
      "--merge-output-format",
      "mkv",
    );
  }

  if (options.subtitles)
    args.push(
      "--write-subs",
      "--write-auto-subs",
      "--sub-langs",
      quote("en.*"),
      "--convert-subs",
      "srt",
    );
  if (options.thumbnail) args.push("--write-thumbnail");
  if (options.outputFolder.trim())
    args.push("--paths", quote(`home:${options.outputFolder.trim()}`));

  const filename = options.isPlaylist
    ? "%(playlist_index)03d - %(title)s [%(id)s].%(ext)s"
    : "%(title)s [%(id)s].%(ext)s";
  args.push("--output", quote(filename), "--", quote(url.href));
  return { command: args.join(" "), error: null };
}
