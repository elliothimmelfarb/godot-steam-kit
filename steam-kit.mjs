#!/usr/bin/env node
// steam-kit: take a Godot 4 game from a project folder to a build on a Steam branch.
//   setup                  install the pinned Godot, its export templates and steamcmd (macOS or Windows)
//   doctor                 check godot, export templates, steamcmd, cached build login
//   init <game>            add steam/steam.json, GodotSteam, the bootstrap autoload, export presets
//   export <game> [os..]   headless release exports into <game>/steam/build/<os>
//   shots <game> [--seconds 20] [--every 4] [-- game args]   1920x1080 frames from a real run
//   assets <game>          check <game>/steam/store-assets against Steam's sizes
//   upload <game> [--preview] [--live <branch>]   write VDFs and run steamcmd
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { checkAssets, appBuildVdf, depotVdf, repairGdextension, setProjectSetting, findAddon, setBundleId } from "./lib.mjs";

const KIT = path.dirname(fileURLToPath(import.meta.url));
const { godot: GODOT_VERSION } = JSON.parse(fs.readFileSync(path.join(KIT, "versions.json"), "utf8"));
const WIN = process.platform === "win32";
const MAC = process.platform === "darwin";
// Tools live per user in a folder of their own, so setup never touches a Godot you already have.
const TOOLS = path.join(WIN ? process.env.LOCALAPPDATA || os.homedir() : path.join(os.homedir(), ".local"), "godot-steam-kit");
const GODOT = process.env.GODOT || (WIN
  ? path.join(TOOLS, "godot", `Godot_v${GODOT_VERSION}-stable_win64_console.exe`)
  : MAC ? path.join(TOOLS, `godot-${GODOT_VERSION}/Godot.app/Contents/MacOS/Godot`)
  : path.join(os.homedir(), ".local/bin/godot"));
const STEAMCMD = process.env.STEAMCMD || path.join(TOOLS, "steamcmd", WIN ? "steamcmd.exe" : "steamcmd.sh");
const TEMPLATES = path.join(
  WIN ? process.env.APPDATA || "" : MAC ? path.join(os.homedir(), "Library/Application Support") : path.join(os.homedir(), ".local/share"),
  WIN || MAC ? "Godot" : "godot", "export_templates", `${GODOT_VERSION}.stable`);
// steamcmd keeps its cached login (config.vdf) here after one manual login by a person.
const STEAM_CONFIG = MAC
  ? path.join(os.homedir(), "Library/Application Support/Steam/config/config.vdf")
  : path.join(path.dirname(STEAMCMD), "config/config.vdf");
const PLATFORMS = { windows: "Windows Desktop", linux: "Linux", macos: "macOS" };
const GODOTSTEAM_RELEASES = "https://codeberg.org/api/v1/repos/godotsteam/godotsteam/releases?limit=20";

const die = (msg) => { console.error(`steam-kit: ${msg}`); process.exit(1); };
const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function gameDir(arg) {
  const dir = path.resolve(arg || ".");
  if (!fs.existsSync(path.join(dir, "project.godot"))) die(`${dir} has no project.godot`);
  return dir;
}

function config(dir) {
  const p = path.join(dir, "steam/steam.json");
  if (!fs.existsSync(p)) die(`no steam/steam.json, run: steam-kit init ${dir}`);
  return readJson(p);
}

function projectName(dir) {
  const m = fs.readFileSync(path.join(dir, "project.godot"), "utf8").match(/^config\/name="(.*)"$/m);
  return m ? m[1] : path.basename(dir);
}

function godotVersion() {
  return execFileSync(GODOT, ["--version"], { encoding: "utf8" }).trim().split("\n").pop();
}

function doctor() {
  let bad = 0;
  const line = (ok, what) => { console.log(`${ok ? "ok  " : "FAIL"} ${what}`); if (!ok) bad++; };
  let v = "";
  try { v = godotVersion(); } catch {}
  line(!!v, `godot ${v || `not found at ${GODOT}`}`);
  line(v.startsWith(GODOT_VERSION), `godot is the pinned ${GODOT_VERSION} (versions.json)`);
  line(fs.existsSync(path.join(TEMPLATES, "windows_release_x86_64.exe")), `export templates ${TEMPLATES}`);
  line(fs.existsSync(STEAMCMD), `steamcmd ${STEAMCMD}`);
  const acct = process.env.STEAM_BUILD_ACCOUNT;
  line(!!acct, `STEAM_BUILD_ACCOUNT ${acct || "unset (export it, see the steam-publishing skill, builds.md)"}`);
  const cfg = STEAM_CONFIG;
  const cached = fs.existsSync(cfg) && acct && fs.readFileSync(cfg, "utf8").toLowerCase().includes(`"${acct.toLowerCase()}"`);
  line(cached, `cached steamcmd login for the build account${cached ? "" : " (a person runs the one-time login, see builds.md)"}`);
  process.exit(bad ? 1 : 0);
}

async function installGodotSteam(dir) {
  const dest = path.join(dir, "addons/godotsteam");
  if (fs.existsSync(dest)) return console.log("GodotSteam already in addons/godotsteam");
  const list = await fetch(GODOTSTEAM_RELEASES);
  if (!list.ok) die(`could not list GodotSteam releases: ${list.status}`);
  const releases = await list.json();
  const rel = releases.find((r) => r.tag_name.endsWith("-gde") && r.assets.some((a) => a.name.endsWith(".zip")));
  if (!rel) die("no GodotSteam GDExtension release found on Codeberg");
  const asset = rel.assets.find((a) => a.name.endsWith(".zip"));
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "godotsteam-"));
  const zip = path.join(tmp, asset.name);
  await download(asset.browser_download_url, zip);
  const unpacked = path.join(tmp, "x");
  unpack(zip, unpacked);
  const subdirs = (d) => fs.readdirSync(d, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
  const found = findAddon(unpacked, subdirs, path.join);
  if (!found) die(`unexpected layout in ${asset.name}`);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(found, dest, { recursive: true });
  const gde = path.join(dest, "godotsteam.gdextension");
  const before = fs.readFileSync(gde, "utf8");
  const after = repairGdextension(before, gde, dir, (p) => fs.existsSync(p));
  if (after !== before) { fs.writeFileSync(gde, after); console.log("repaired library paths in godotsteam.gdextension"); }
  console.log(`installed GodotSteam ${rel.tag_name} into addons/godotsteam`);
}

async function download(url, file) {
  const res = await fetch(url);
  if (!res.ok) die(`download failed ${res.status}: ${url}`);
  fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
}

// bsdtar unpacks zip and tar on macOS and Windows 10+. GNU tar on Linux cannot read a zip.
function unpack(archive, into) {
  fs.mkdirSync(into, { recursive: true });
  if (!WIN && !MAC && archive.endsWith(".zip")) execFileSync("unzip", ["-q", archive, "-d", into]);
  else execFileSync("tar", ["-xf", archive, "-C", into]);
}

async function setup() {
  if (!WIN && !MAC) die("setup knows macOS and Windows; install Godot and steamcmd by hand here");
  const gh = `https://github.com/godotengine/godot/releases/download/${GODOT_VERSION}-stable`;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "steam-kit-"));
  let have = "";
  try { have = godotVersion(); } catch {}
  if (!have.startsWith(GODOT_VERSION)) {
    console.log(`installing Godot ${GODOT_VERSION}`);
    const zip = path.join(tmp, "godot.zip");
    if (WIN) {
      await download(`${gh}/Godot_v${GODOT_VERSION}-stable_win64.exe.zip`, zip);
      unpack(zip, path.dirname(GODOT));
    } else {
      await download(`${gh}/Godot_v${GODOT_VERSION}-stable_macos.universal.zip`, zip);
      const home = path.join(TOOLS, `godot-${GODOT_VERSION}`);
      fs.rmSync(home, { recursive: true, force: true });
      unpack(zip, home);
    }
  }
  if (!fs.existsSync(path.join(TEMPLATES, "windows_release_x86_64.exe"))) {
    console.log("installing export templates (about 1 GB)");
    const tpz = path.join(tmp, "templates.tpz");
    await download(`${gh}/Godot_v${GODOT_VERSION}-stable_export_templates.tpz`, tpz);
    unpack(tpz, path.join(tmp, "t"));
    fs.mkdirSync(TEMPLATES, { recursive: true });
    fs.cpSync(path.join(tmp, "t/templates"), TEMPLATES, { recursive: true });
  }
  if (!fs.existsSync(STEAMCMD)) {
    console.log("installing steamcmd");
    const a = path.join(tmp, WIN ? "steamcmd.zip" : "steamcmd.tar.gz");
    await download(`https://steamcdn-a.akamaihd.net/client/installer/${WIN ? "steamcmd.zip" : "steamcmd_osx.tar.gz"}`, a);
    unpack(a, path.dirname(STEAMCMD));
    // First run updates steamcmd itself.
    spawnSync(STEAMCMD, ["+quit"], { stdio: "inherit" });
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log("setup done, now: steam-kit doctor");
}

function addAutoload(dir) {
  const p = path.join(dir, "project.godot");
  let text = fs.readFileSync(p, "utf8");
  if (text.includes("SteamBootstrap=")) return;
  const entry = 'SteamBootstrap="*res://addons/steam_kit/steam_bootstrap.gd"';
  text = /^\[autoload\]$/m.test(text)
    ? text.replace(/^\[autoload\]\n/m, `[autoload]\n\n${entry}\n`)
    : `${text.trimEnd()}\n\n[autoload]\n\n${entry}\n`;
  fs.writeFileSync(p, text);
}

async function init(dir) {
  const name = projectName(dir);
  const cfgPath = path.join(dir, "steam/steam.json");
  fs.mkdirSync(path.join(dir, "steam/store-assets/screenshots"), { recursive: true });
  if (!fs.existsSync(cfgPath)) {
    fs.writeFileSync(cfgPath, JSON.stringify({
      name,
      appId: 480,
      depots: { windows: null, linux: null, macos: null },
      exe: name.replace(/[^A-Za-z0-9]+/g, ""),
      bundleId: `com.example.${slug(name)}`,
      betaBranch: "staging",
    }, null, 2) + "\n");
    console.log("wrote steam/steam.json (appId 480 is Valve's test app; set your own appId, depots and bundleId before uploading)");
  }
  const launch = path.join(dir, "steam/LAUNCH.md");
  if (!fs.existsSync(launch)) fs.copyFileSync(path.join(KIT, "templates/LAUNCH.md"), launch);
  const cfg = readJson(cfgPath);
  await installGodotSteam(dir);
  fs.mkdirSync(path.join(dir, "addons/steam_kit"), { recursive: true });
  fs.copyFileSync(path.join(KIT, "godot/steam_bootstrap.gd"), path.join(dir, "addons/steam_kit/steam_bootstrap.gd"));
  addAutoload(dir);
  // macOS universal exports refuse to run without ETC2/ASTC textures imported.
  const pg = path.join(dir, "project.godot");
  fs.writeFileSync(pg, setProjectSetting(fs.readFileSync(pg, "utf8"), "rendering", "textures/vram_compression/import_etc2_astc", "true"));
  const presets = path.join(dir, "export_presets.cfg");
  if (!fs.existsSync(presets)) {
    fs.writeFileSync(presets, fs.readFileSync(path.join(KIT, "godot/export_presets.cfg"), "utf8")
      .replaceAll("{{EXE}}", cfg.exe).replaceAll("{{NAME}}", cfg.name).replaceAll("{{BUNDLE_ID}}", cfg.bundleId));
    console.log("wrote export_presets.cfg (Windows, Linux, macOS)");
  } else console.log("export_presets.cfg exists, left alone: it needs presets named " + Object.values(PLATFORMS).join(", "));
  const gi = path.join(dir, ".gitignore");
  const have = fs.existsSync(gi) ? fs.readFileSync(gi, "utf8") : "";
  const want = ["steam/build/", "steam/output/"].filter((l) => !have.includes(l));
  if (want.length) fs.appendFileSync(gi, `${have && !have.endsWith("\n") ? "\n" : ""}${want.join("\n")}\n`);
  console.log("done. next: steam-kit export " + dir);
}

function exportGame(dir, only) {
  const cfg = config(dir);
  // The bootstrap's APP_ID follows steam.json on every export.
  const boot = path.join(dir, "addons/steam_kit/steam_bootstrap.gd");
  if (fs.existsSync(boot)) {
    fs.writeFileSync(boot, fs.readFileSync(boot, "utf8").replace(/^const APP_ID := \d+$/m, `const APP_ID := ${cfg.appId}`));
  }
  // So does the macOS bundle id: init wrote it once, and steam.json may have changed since.
  const presets = path.join(dir, "export_presets.cfg");
  if (fs.existsSync(presets)) fs.writeFileSync(presets, setBundleId(fs.readFileSync(presets, "utf8"), cfg.bundleId));
  // First run imports assets; a fresh clone exports nothing useful without it.
  spawnSync(GODOT, ["--headless", "--path", dir, "--import"], { stdio: "inherit" });
  const wanted = only.length ? only : Object.keys(PLATFORMS);
  let failed = 0;
  for (const p of wanted) {
    if (!PLATFORMS[p]) die(`unknown platform ${p}`);
    // Godot writes a .app only on a Mac host; elsewhere it writes a zip we unpack.
    const ext = { windows: ".exe", linux: ".x86_64", macos: MAC ? ".app" : ".zip" }[p];
    const out = path.join(dir, "steam/build", p);
    fs.rmSync(out, { recursive: true, force: true });
    fs.mkdirSync(out, { recursive: true });
    const target = p === "macos" && !MAC ? path.join(dir, "steam/output", `${cfg.exe}.zip`) : path.join(out, cfg.exe + ext);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    const r = spawnSync(GODOT, ["--headless", "--path", dir, "--export-release", PLATFORMS[p], target], { stdio: "inherit" });
    if (r.status === 0 && target.endsWith(".zip")) { unpack(target, out); fs.rmSync(target); }
    const files = fs.readdirSync(out);
    const ok = r.status === 0 && files.length > 0;
    console.log(`${ok ? "ok  " : "FAIL"} ${p}: ${files.join(", ") || "nothing exported"}`);
    if (!ok) failed++;
  }
  process.exit(failed ? 1 : 0);
}

// Movie Maker records at the window size, which follows the viewport size when no
// window override is set. A temporary override.cfg makes that 1920x1080 on any screen.
function shots(dir, args) {
  const dd = args.indexOf("--");
  const userArgs = dd >= 0 ? args.slice(dd + 1) : [];
  const opt = (name, dflt) => { const i = args.indexOf(name); return i >= 0 && (dd < 0 || i < dd) ? Number(args[i + 1]) : dflt; };
  const seconds = opt("--seconds", 20), every = opt("--every", 4), fps = 30;
  const out = path.join(dir, "steam/output/shots");
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  const ovr = path.join(dir, "override.cfg");
  const saved = fs.existsSync(ovr) ? fs.readFileSync(ovr, "utf8") : null;
  fs.writeFileSync(ovr, "[display]\n\nwindow/size/viewport_width=1920\nwindow/size/viewport_height=1080\nwindow/size/mode=0\n");
  try {
    spawnSync(GODOT, ["--path", dir, "--write-movie", path.join(out, "f.png"), "--fixed-fps", String(fps),
      "--quit-after", String(seconds * fps), ...(userArgs.length ? ["--", ...userArgs] : [])], { stdio: "ignore" });
  } finally {
    if (saved === null) fs.rmSync(ovr, { force: true }); else fs.writeFileSync(ovr, saved);
  }
  // Keep one frame every `every` seconds; Movie Maker also writes a .wav we do not need.
  const frames = fs.readdirSync(out).filter((f) => f.endsWith(".png")).sort();
  const keep = new Set(frames.filter((_, i) => i > 0 && i % (every * fps) === 0));
  for (const f of fs.readdirSync(out)) if (!keep.has(f)) fs.rmSync(path.join(out, f));
  console.log(`${keep.size} frames at 1920x1080 in ${out}; copy the good ones to steam/store-assets/screenshots/`);
}

function readTree(root, rel = "") {
  const out = {};
  for (const e of fs.readdirSync(path.join(root, rel), { withFileTypes: true })) {
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) Object.assign(out, readTree(root, r));
    else out[r] = fs.readFileSync(path.join(root, r));
  }
  return out;
}

function assets(dir) {
  const root = path.join(dir, "steam/store-assets");
  if (!fs.existsSync(root)) die(`no ${root}`);
  const { errors, ok } = checkAssets(readTree(root));
  ok.forEach((l) => console.log(`ok   ${l}`));
  errors.forEach((l) => console.log(`FAIL ${l}`));
  process.exit(errors.length ? 1 : 0);
}

function upload(dir, args) {
  const cfg = config(dir);
  const preview = args.includes("--preview");
  const li = args.indexOf("--live");
  if (li >= 0 && !args[li + 1]) die("--live needs a branch name");
  const live = li >= 0 ? args[li + 1] : cfg.betaBranch;
  if (cfg.appId === 480) die("steam.json still has the test appId 480");
  const depots = Object.fromEntries(Object.entries(cfg.depots).filter(([, id]) => id));
  if (!Object.keys(depots).length) die("steam.json has no depot ids");
  for (const p of Object.keys(depots)) {
    const b = path.join(dir, "steam/build", p);
    if (!fs.existsSync(b) || !fs.readdirSync(b).length) die(`no build for ${p}, run steam-kit export first`);
  }
  const acct = process.env.STEAM_BUILD_ACCOUNT || die("STEAM_BUILD_ACCOUNT is unset");
  // Without a cached login steamcmd asks for a password, which an agent must never type.
  const cached = fs.existsSync(STEAM_CONFIG) && fs.readFileSync(STEAM_CONFIG, "utf8").toLowerCase().includes(`"${acct.toLowerCase()}"`);
  if (!cached) die(`no cached steamcmd login for ${acct}. A person runs this once, in a terminal: ${STEAMCMD} +login ${acct} +quit`);
  const scripts = path.join(dir, "steam/output/scripts");
  fs.mkdirSync(scripts, { recursive: true });
  let sha = "";
  try { sha = execFileSync("git", ["-C", dir, "rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim(); } catch {}
  const desc = `${cfg.name} ${new Date().toISOString().slice(0, 16)}${sha ? ` ${sha}` : ""}`;
  fs.writeFileSync(path.join(scripts, `app_build_${cfg.appId}.vdf`),
    appBuildVdf({ appId: cfg.appId, desc, depots, setLive: preview ? "" : live, preview, buildOutput: path.join(dir, "steam/output") }));
  for (const [p, id] of Object.entries(depots)) {
    fs.writeFileSync(path.join(scripts, `depot_build_${id}.vdf`), depotVdf({ depotId: id, contentRoot: path.join(dir, "steam/build", p) }));
  }
  // steamcmd cannot set the default branch live, so appBuildVdf drops it. Say so.
  console.log(`${preview ? "preview" : "upload"} ${desc} -> ${preview || live === "default" ? "no branch" : `branch "${live}"`}`);
  const r = spawnSync(STEAMCMD, ["+login", acct, "+run_app_build", path.join(scripts, `app_build_${cfg.appId}.vdf`), "+quit"], { stdio: "inherit" });
  process.exit(r.status ?? 1);
}

const [cmd, target, ...rest] = process.argv.slice(2);
if (cmd === "setup") await setup();
else if (cmd === "doctor") doctor();
else if (cmd === "init") await init(gameDir(target));
else if (cmd === "export") exportGame(gameDir(target), rest);
else if (cmd === "shots") shots(gameDir(target), rest);
else if (cmd === "assets") assets(path.resolve(target || "."));
else if (cmd === "upload") upload(gameDir(target), rest);
else { console.log(fs.readFileSync(fileURLToPath(import.meta.url), "utf8").split("\n").filter((l) => l.startsWith("//")).slice(0, 8).join("\n").replace(/^\/\/ ?/gm, "")); process.exit(cmd ? 1 : 0); }
