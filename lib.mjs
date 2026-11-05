// Pure helpers for steam-kit: image sizes, the store-asset rules, and SteamPipe VDFs.
// Sizes from partner.steamgames.com/doc/store/assets (checked 2026-10-30).

export function imageSize(buf) {
  if (buf.length >= 24 && buf.readUInt32BE(0) === 0x89504e47) {
    return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20), type: "png" };
  }
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) return null;
      const marker = buf[i + 1];
      const len = buf.readUInt16BE(i + 2);
      // SOF0..SOF15, minus DHT (c4), JPG (c8) and DAC (cc), carry the frame size.
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { w: buf.readUInt16BE(i + 7), h: buf.readUInt16BE(i + 5), type: "jpg" };
      }
      i += 2 + len;
    }
  }
  return null;
}

// PNG colour types 4 and 6 carry alpha. Palette PNGs (3) may via tRNS; accept them.
function pngHasAlpha(buf) {
  return [3, 4, 6].includes(buf[25]);
}

export const ASSETS = [
  { name: "header_capsule", w: 920, h: 430, required: true },
  { name: "small_capsule", w: 462, h: 174, required: true },
  { name: "main_capsule", w: 1232, h: 706, required: true },
  { name: "vertical_capsule", w: 748, h: 896, required: true },
  { name: "page_background", w: 1438, h: 810, required: false },
  { name: "library_capsule", w: 600, h: 900, required: true },
  { name: "library_header", w: 920, h: 430, required: false },
  { name: "library_hero", w: 3840, h: 1240, required: true },
  { name: "library_logo", logo: true, required: true },
];

// files: { "relative/path.png": Buffer }. Returns { errors, ok } as readable lines.
export function checkAssets(files) {
  const errors = [];
  const ok = [];
  const byStem = {};
  for (const [p, buf] of Object.entries(files)) {
    const m = p.match(/^([^/]+)\.(png|jpe?g)$/i);
    if (m) byStem[m[1].toLowerCase()] = { p, buf };
  }
  for (const a of ASSETS) {
    const f = byStem[a.name];
    if (!f) {
      if (a.required) errors.push(`${a.name}: missing (want ${a.logo ? "PNG 1280 wide or 720 tall" : `${a.w}x${a.h}`})`);
      continue;
    }
    const s = imageSize(f.buf);
    if (!s) { errors.push(`${f.p}: not a readable PNG or JPEG`); continue; }
    if (a.logo) {
      if (s.type !== "png" || !pngHasAlpha(f.buf)) errors.push(`${f.p}: must be a PNG with transparency`);
      else if (s.w !== 1280 && s.h !== 720) errors.push(`${f.p}: is ${s.w}x${s.h}, want 1280 wide or 720 tall`);
      else ok.push(`${f.p}: ${s.w}x${s.h}`);
    } else if (s.w !== a.w || s.h !== a.h) {
      errors.push(`${f.p}: is ${s.w}x${s.h}, want ${a.w}x${a.h}`);
    } else ok.push(`${f.p}: ${s.w}x${s.h}`);
  }
  const shots = Object.entries(files).filter(([p]) => /^screenshots\/[^/]+\.(png|jpe?g)$/i.test(p));
  for (const [p, buf] of shots) {
    const s = imageSize(buf);
    // Valve wants 16:9 at 1920x1080 or larger.
    if (!s || s.w < 1920 || s.h < 1080 || s.w * 9 !== s.h * 16) {
      errors.push(`${p}: is ${s ? `${s.w}x${s.h}` : "unreadable"}, want 16:9 at 1920x1080 or larger`);
    } else ok.push(`${p}: ${s.w}x${s.h}`);
  }
  if (shots.length < 5) errors.push(`screenshots/: has ${shots.length}, Steam wants at least 5 screenshots of gameplay`);
  return { errors, ok };
}

const q = (s) => `"${String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;

// depots: { platform: depotId }. setLive names a beta branch; the default branch
// cannot be set live from steamcmd, so "default" is dropped here on purpose.
export function appBuildVdf({ appId, desc = "", depots, setLive = "", preview = false, buildOutput = "../output" }) {
  const live = setLive === "default" ? "" : setLive;
  const lines = Object.values(depots).map((id) => `\t\t${q(id)} ${q(`depot_build_${id}.vdf`)}`);
  return `"AppBuild"
{
\t"AppID" ${q(appId)}
\t"Desc" ${q(desc)}
\t"BuildOutput" ${q(buildOutput)}
\t"ContentRoot" ""
\t"SetLive" ${q(live)}
\t"Preview" ${q(preview ? 1 : 0)}
\t"Depots"
\t{
${lines.join("\n")}
\t}
}
`;
}

export function depotVdf({ depotId, contentRoot }) {
  return `"DepotBuild"
{
\t"DepotID" ${q(depotId)}
\t"ContentRoot" ${q(contentRoot)}
\t"FileMapping"
\t{
\t\t"LocalPath" "*"
\t\t"DepotPath" "."
\t\t"Recursive" "1"
\t}
\t"FileExclusion" "*.pdb"
\t"FileExclusion" "steam_appid.txt"
}
`;
}

// GodotSteam 4.23.2 ships macOS libs as *.universal.dylib while its .gdextension
// names *.dylib. Point each res:// path that does not exist at a sibling that does.
// exists(absPath) is injected so this stays pure.
export function repairGdextension(text, _file, projectRoot, exists) {
  return text.replace(/"res:\/\/([^"]+?)\.(dylib|so|dll)"/g, (whole, stem, ext) => {
    const abs = (rel) => `${projectRoot}/${rel}`;
    if (exists(abs(`${stem}.${ext}`))) return whole;
    const alt = `${stem}.universal.${ext}`;
    return exists(abs(alt)) ? `"res://${alt}"` : whole;
  });
}

// Depth-first search for addons/godotsteam under root, whatever a release wraps it in.
// subdirs(dir) and join are injected so this stays pure.
export function findAddon(root, subdirs, join) {
  for (const d of subdirs(root)) {
    const p = join(root, d);
    if (d === "addons" && subdirs(p).includes("godotsteam")) return join(p, "godotsteam");
    const hit = findAddon(p, subdirs, join);
    if (hit) return hit;
  }
  return null;
}

// The macOS preset keeps its own copy of the bundle id; keep it equal to steam.json.
export function setBundleId(presets, id) {
  return presets.replace(/^application\/bundle_identifier=".*"$/m, () => `application/bundle_identifier="${id}"`);
}

// Set key=value under [section] of a project.godot, replacing an existing value.
export function setProjectSetting(text, section, key, value) {
  const lines = text.split("\n");
  const start = lines.findIndex((l) => l === `[${section}]`);
  if (start < 0) return `${text.trimEnd()}\n\n[${section}]\n\n${key}=${value}\n`;
  let end = lines.findIndex((l, i) => i > start && /^\[.+\]$/.test(l));
  if (end < 0) end = lines.length;
  const at = lines.findIndex((l, i) => i > start && i < end && l.startsWith(`${key}=`));
  if (at >= 0) lines[at] = `${key}=${value}`;
  else lines.splice(start + 1, 0, "", `${key}=${value}`.trimEnd());
  // Keep one blank line after the header, as Godot writes it.
  return lines.join("\n").replace(new RegExp(`\\[${section}\\]\\n\\n\\n`), `[${section}]\n\n`);
}
