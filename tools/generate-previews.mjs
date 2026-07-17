import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataPath = path.join(root, "assets", "site-data.js");
const context = { window: {} };
const force = process.argv.includes("--force");

vm.runInNewContext(fs.readFileSync(dataPath, "utf8"), context);

const data = context.window.PORTFOLIO_DATA;
const allItems = [
  ...data.heroVideos.map((item) => ({ ...item, preview: null })),
  ...data.featuredWorks,
  ...data.experiments,
];

fs.mkdirSync(path.join(root, "assets", "posters"), { recursive: true });
fs.mkdirSync(path.join(root, "assets", "previews"), { recursive: true });

function toDisk(relativePath) {
  return path.join(root, ...relativePath.split("/"));
}

function runFfmpeg(args) {
  const result = spawnSync("ffmpeg", args, { cwd: root, stdio: "pipe", encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `ffmpeg exited with ${result.status}`);
  }
}

function generatePoster(item) {
  if (!item.poster) return;
  const canOverwrite = force && item.poster.startsWith("assets/posters/");
  if (!canOverwrite && fs.existsSync(toDisk(item.poster))) return;
  runFfmpeg([
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-ss",
    "1",
    "-i",
    toDisk(item.source),
    "-frames:v",
    "1",
    "-vf",
    "scale='if(gt(iw,ih),1280,-2)':'if(gt(iw,ih),-2,1280)'",
    "-q:v",
    "4",
    toDisk(item.poster),
  ]);
}

function generatePreview(item) {
  if (!item.preview || (!force && fs.existsSync(toDisk(item.preview)))) return;
  runFfmpeg([
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-i",
    toDisk(item.source),
    "-t",
    "8",
    "-vf",
    "scale='if(gt(iw,ih),960,-2)':'if(gt(iw,ih),-2,960)'",
    "-an",
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "31",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    toDisk(item.preview),
  ]);
}

for (const item of allItems) {
  if (!fs.existsSync(toDisk(item.source))) {
    throw new Error(`Missing source video: ${item.source}`);
  }
  process.stdout.write(`asset ${item.id || item.source}\n`);
  generatePoster(item);
  generatePreview(item);
}
