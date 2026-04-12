/**
 * Downloads all boss images from the OSRS wiki into public/bosses/
 * Run from the osrs-bingo/ folder:
 *
 *   node download-bosses.mjs
 *
 * Requires Node 18+ (built-in fetch).
 */

import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import http from "node:http";
import https from "node:https";

// If running on Node versions without global fetch (Node < 18), provide a
// tiny native implementation using `node:http` / `node:https` so this script
// works on Node 16 without installing newer `undici` versions that require
// newer Node runtimes.
if (typeof fetch === "undefined") {
  const MAX_REDIRECTS = 6;

  async function _fetch(url, options = {}, redirectCount = 0) {
    return new Promise((resolve, reject) => {
      try {
        const u = new URL(url);
        const lib = u.protocol === "https:" ? https : http;
        const headers = options.headers || {};
        const req = lib.get(url, { headers }, (res) => {
          // handle redirects
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            if (redirectCount >= MAX_REDIRECTS) {
              reject(new Error("Too many redirects"));
              return;
            }
            // Location may be relative
            const loc = new URL(res.headers.location, url).toString();
            resolve(_fetch(loc, options, redirectCount + 1));
            return;
          }

          const chunks = [];
          res.on("data", (c) => chunks.push(Buffer.from(c)));
          res.on("end", () => {
            const buf = Buffer.concat(chunks);
            resolve({
              ok: res.statusCode >= 200 && res.statusCode < 300,
              status: res.statusCode,
              headers: res.headers,
              arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
              json: async () => JSON.parse(buf.toString("utf8")),
            });
          });
        });
        req.on("error", reject);
      } catch (err) {
        reject(err);
      }
    });
  }

  globalThis.fetch = _fetch;
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "public", "bosses");
mkdirSync(OUT_DIR, { recursive: true });

const BOSSES = [
  { id: "jad",       file: "TzTok-Jad.png" },
  { id: "kril",      file: "K'ril_Tsutsaroth.png" },
  { id: "kreearra",  file: "Kree'arra.png" },
  { id: "zilyana",   file: "Commander_Zilyana.png" },
  { id: "graardor",  file: "General_Graardor.png" },
  // Use the serpentine variant filename from the wiki
  { id: "zulrah",    file: "Zulrah_(serpentine).png" },
  { id: "kq",        file: "Kalphite_Queen.png" },
  { id: "cerberus",  file: "Cerberus.png" },
  { id: "vardorvis", file: "Vardorvis.png" },
  { id: "vorkath",   file: "Vorkath.png" },
  { id: "nightmare", file: "The_Nightmare.png" },
  // Use the ranged variant filename from the wiki
  { id: "phantom",   file: "Phantom_Muspah_(ranged).png" },
  { id: "leviathan", file: "The_Leviathan.png" },
  { id: "nex",       file: "Nex.png" },
  // Use the serpentine variant filename from the wiki
  { id: "hydra",     file: "Alchemical_Hydra_(serpentine).png" },
  { id: "zuk",       file: "TzKal-Zuk.png" },
  { id: "cox",       file: "Great_Olm.png" },
  { id: "tob",       file: "Verzik_Vitur.png" },
  { id: "corp",      file: "Corporeal_Beast.png" },
];

const UA = "osrs-bingo-downloader/1.0";

async function getImageUrl(filename) {
  const title = "File:" + filename;
  const params = new URLSearchParams({
    action: "query",
    titles: title,
    prop: "imageinfo",
    iiprop: "url",
    format: "json",
    origin: "*",
  });
  const res = await fetch("https://oldschool.runescape.wiki/api.php?" + params, {
    headers: { "User-Agent": UA },
  });
  if (!res.ok) throw new Error("API HTTP " + res.status);
  const data = await res.json();
  const pages = Object.values(data.query.pages);
  const url = pages[0]?.imageinfo?.[0]?.url;
  if (!url) throw new Error("No URL in response: " + JSON.stringify(pages[0]));
  return url;
}

async function download(url, dest) {
  const res = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow" });
  if (!res.ok) throw new Error("Download HTTP " + res.status);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 200) throw new Error("File too small (" + buf.length + " bytes)");
  writeFileSync(dest, buf);
  return buf.length;
}

let ok = 0, fail = 0;

for (const boss of BOSSES) {
  const dest = join(OUT_DIR, boss.id + ".png");
  try {
    process.stdout.write("Downloading " + boss.file + " ... ");
    const imgUrl = await getImageUrl(boss.file);
    const bytes = await download(imgUrl, dest);
    console.log("OK (" + Math.round(bytes/1024) + " KB)");
    ok++;
    await new Promise(r => setTimeout(r, 300));
  } catch (err) {
    // Try a direct Special:FilePath fallback which often redirects to the
    // actual image even when the API query didn't find the file title.
    try {
      process.stdout.write("(fallback) Trying Special:FilePath for " + boss.file + " ... ");
      const fpUrl = "https://oldschool.runescape.wiki/w/Special:FilePath/" + encodeURIComponent(boss.file);
      const res = await fetch(fpUrl, { headers: { "User-Agent": UA }, redirect: "follow" });
      if (!res.ok) throw new Error("Fallback HTTP " + res.status);
      const buf = Buffer.from(await res.arrayBuffer());
      writeFileSync(dest, buf);
      console.log("OK (" + Math.round(buf.length/1024) + " KB)");
      ok++;
      await new Promise(r => setTimeout(r, 300));
    } catch (err2) {
      console.log("FAILED: " + err.message);
      fail++;
    }
  }
}

console.log("\nDone: " + ok + " succeeded, " + fail + " failed.");
if (fail > 0) {
  console.log("For any failures, visit https://oldschool.runescape.wiki/w/Special:FilePath/<filename>");
  console.log("Save manually into public/bosses/ using the boss id as filename (e.g. vorkath.png)");
}
