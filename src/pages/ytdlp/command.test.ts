import { describe, expect, it } from "vitest";
import {
  buildCommand,
  DEFAULT_OPTIONS,
  quoteArgument,
  type DownloadOptions,
} from "./command";

const VIDEO = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
const PLAYLIST = `${VIDEO}&list=PL_example`;

function build(overrides: Partial<DownloadOptions> = {}) {
  return buildCommand({ ...DEFAULT_OPTIONS, url: VIDEO, ...overrides });
}

describe("yt-dlp command builder", () => {
  it("builds the complete default command", () => {
    expect(build()).toEqual({
      error: null,
      command:
        ".\\yt-dlp.exe --ignore-config --js-runtimes node --no-playlist --no-overwrites --format 'bv*+ba/b' --merge-output-format mkv --output '%(title)s [%(id)s].%(ext)s' -- 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'",
    });
  });

  it("uses the PATH executable for Bash/Zsh and explicitly enables Node.js", () => {
    expect(build({ shell: "posix" }).command).toMatch(
      /^yt-dlp --ignore-config --js-runtimes node /,
    );
  });

  it.each(["1080", "720"] as const)(
    "caps both video alternatives at %sp",
    (videoQuality) => {
      expect(build({ videoQuality }).command).toContain(
        `--format 'bv*[height<=${videoQuality}]+ba/b[height<=${videoQuality}]'`,
      );
    },
  );

  it.each([
    ["best", "0"],
    ["320", "320K"],
    ["192", "192K"],
  ] as const)("selects MP3 audio quality %s", (audioQuality, expected) => {
    const result = build({ mp3Only: true, audioQuality, videoQuality: "720" });
    expect(result.command).toContain(
      `--format 'ba/b' --extract-audio --audio-format mp3 --audio-quality ${expected}`,
    );
    expect(result.command).not.toMatch(/height|merge-output-format/);
  });

  it("selects playlists explicitly and adds an index without losing video IDs", () => {
    const result = build({ url: PLAYLIST, isPlaylist: true });
    expect(result.command).toContain("--yes-playlist");
    expect(result.command).not.toContain("--no-playlist");
    expect(result.command).toContain(
      "--output '%(playlist_index)03d - %(title)s [%(id)s].%(ext)s'",
    );
  });

  it("allows a video-in-playlist URL in single mode", () => {
    expect(build({ url: PLAYLIST }).command).toContain("--no-playlist");
  });

  it("requires a playlist URL for playlist mode and a video URL for single mode", () => {
    expect(build({ isPlaylist: true })).toMatchObject({
      command: null,
      field: "url",
      error: expect.stringContaining("list="),
    });
    const url = "https://youtube.com/playlist?list=PL_example";
    expect(build({ url, isPlaylist: true }).error).toBeNull();
    expect(build({ url })).toMatchObject({
      command: null,
      field: "url",
      error: expect.stringContaining("Select Playlist"),
    });
  });

  it.each([
    "https://youtu.be/dQw4w9WgXcQ",
    "https://www.youtu.be/dQw4w9WgXcQ?t=10",
    "https://youtube.com/shorts/dQw4w9WgXcQ",
    "https://youtube.com/live/dQw4w9WgXcQ",
    "https://youtube.com/embed/dQw4w9WgXcQ",
    "https://m.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://music.youtube.com/watch?v=dQw4w9WgXcQ",
    `  ${VIDEO}  `,
  ])("accepts supported YouTube URL %s", (url) => {
    expect(build({ url }).error).toBeNull();
  });

  it.each([
    "",
    "not a URL",
    "youtube.com/watch?v=dQw4w9WgXcQ",
    "https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ",
    "https://evilyoutu.be/dQw4w9WgXcQ",
    "https://user:password@youtube.com/watch?v=dQw4w9WgXcQ",
    "https://youtube.com:8080/watch?v=dQw4w9WgXcQ",
    "ftp://youtube.com/watch?v=dQw4w9WgXcQ",
    "https://youtube.com/@channel",
    "https://youtube.com/watch?v=bad",
    "https://youtube.com/playlist",
    "https://youtube.com/playlist?list=",
    `${VIDEO}\n; whoami`,
    `${VIDEO}\u0000`,
  ])("reports invalid URL %s instead of producing a command", (url) => {
    expect(build({ url })).toMatchObject({
      command: null,
      field: "url",
      error: expect.any(String),
    });
  });

  it("adds separate English SRT subtitles and a thumbnail in both media modes", () => {
    for (const mp3Only of [true, false]) {
      const result = build({ mp3Only, subtitles: true, thumbnail: true });
      expect(result.command).toContain(
        "--write-subs --write-auto-subs --sub-langs 'en.*' --convert-subs srt --write-thumbnail",
      );
    }
    expect(build().command).not.toMatch(/--write|--sub-langs/);
  });

  it("quotes PowerShell paths without expanding variables or executable expressions", () => {
    const outputFolder = "C:\\O'Brien\\$HOME; $(whoami)` & downloads";
    expect(build({ outputFolder }).command).toContain(
      "--paths 'home:C:\\O''Brien\\$HOME; $(whoami)` & downloads'",
    );
    expect(quoteArgument("a'b", "powershell")).toBe("'a''b'");
  });

  it("quotes POSIX apostrophes without expanding shell expressions", () => {
    const outputFolder = "/tmp/O'Brien/$HOME; $(whoami)` & downloads";
    expect(build({ shell: "posix", outputFolder }).command).toContain(
      `--paths 'home:/tmp/O'"'"'Brien/$HOME; $(whoami)\` & downloads'`,
    );
    expect(quoteArgument("a'b", "posix")).toBe(`'a'"'"'b'`);
  });

  it("normalizes quote characters in URLs and keeps query strings in one argument", () => {
    for (const shell of ["powershell", "posix"] as const) {
      const url = `${VIDEO}&x=';$(whoami)&y="test"`;
      const result = build({ shell, url });
      expect(result.command).toContain(
        `-- ${quoteArgument(new URL(url).href, shell)}`,
      );
      expect(new URL(url).href).not.toContain("'");
    }
  });

  it("treats path prefixes as literal parts of the home folder", () => {
    expect(build({ outputFolder: "temp:downloads" }).command).toContain(
      "--paths 'home:temp:downloads'",
    );
    expect(build({ outputFolder: "   " }).command).not.toContain("--paths");
  });

  it.each(["a\nb", "a\rb", "a\u0000b", "a\u2028b", "O\u2019Brien"])(
    "rejects unsafe PowerShell folder %s with a visible field error",
    (outputFolder) => {
      expect(build({ outputFolder })).toMatchObject({
        command: null,
        field: "outputFolder",
        error: expect.any(String),
      });
    },
  );

  it("allows curly apostrophes as literal POSIX path characters", () => {
    expect(
      build({ shell: "posix", outputFolder: "O\u2019Brien" }).error,
    ).toBeNull();
  });
});
