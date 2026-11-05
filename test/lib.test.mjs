import { test } from "node:test";
import assert from "node:assert/strict";
import { imageSize, checkAssets, appBuildVdf, depotVdf, repairGdextension, setProjectSetting, findAddon, setBundleId } from "../lib.mjs";

// A 1x1 PNG with its width/height patched, so the header is all that is read.
function png(w, h) {
  const b = Buffer.from(
    "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489", "hex");
  b.writeUInt32BE(w, 16);
  b.writeUInt32BE(h, 20);
  return b;
}

// Minimal JPEG: SOI, an APP0 segment to skip over, then SOF0 carrying h and w.
function jpg(w, h) {
  const app0 = Buffer.from("ffe000104a46494600010100000100010000", "hex");
  const sof = Buffer.alloc(19);
  sof.writeUInt16BE(0xffc0, 0); sof.writeUInt16BE(17, 2); sof[4] = 8;
  sof.writeUInt16BE(h, 5); sof.writeUInt16BE(w, 7);
  return Buffer.concat([Buffer.from("ffd8", "hex"), app0, sof]);
}

test("reads PNG and JPEG dimensions", () => {
  assert.deepEqual(imageSize(png(920, 430)), { w: 920, h: 430, type: "png" });
  assert.deepEqual(imageSize(jpg(1920, 1080)), { w: 1920, h: 1080, type: "jpg" });
});

test("flags a wrong-size capsule, a missing one, and too few screenshots", () => {
  const files = {
    "header_capsule.png": png(920, 430),
    "small_capsule.png": png(460, 174),
    "screenshots/01.png": png(1920, 1080),
    "screenshots/02.jpg": jpg(1280, 720),
  };
  const { errors } = checkAssets(files);
  assert.ok(errors.some((e) => e.includes("small_capsule") && e.includes("462x174")));
  assert.ok(errors.some((e) => e.includes("main_capsule") && e.includes("missing")));
  assert.ok(errors.some((e) => e.includes("02.jpg") && e.includes("1920x1080")));
  assert.ok(errors.some((e) => e.includes("at least 5 screenshots")));
  assert.ok(!errors.some((e) => e.includes("header_capsule")));
});

test("library logo needs a transparent PNG 1280 wide or 720 tall", () => {
  const ok = checkAssets({ "library_logo.png": png(1280, 400) }).errors;
  assert.ok(!ok.some((e) => e.includes("library_logo")));
  const bad = checkAssets({ "library_logo.png": png(1000, 400) }).errors;
  assert.ok(bad.some((e) => e.includes("library_logo")));
});

test("app build VDF never sets the default branch live", () => {
  const vdf = appBuildVdf({ appId: 123, desc: "v1", depots: { windows: 124 }, setLive: "default" });
  assert.match(vdf, /"AppID" "123"/);
  assert.match(vdf, /"124" "depot_build_124.vdf"/);
  assert.match(vdf, /"SetLive" ""/);
  assert.match(appBuildVdf({ appId: 1, depots: {}, setLive: "staging" }), /"SetLive" "staging"/);
  assert.match(appBuildVdf({ appId: 1, depots: {}, preview: true }), /"Preview" "1"/);
});

test("depot VDF maps a platform folder recursively and drops debug files", () => {
  const vdf = depotVdf({ depotId: 124, contentRoot: "/b/windows" });
  assert.match(vdf, /"DepotID" "124"/);
  assert.match(vdf, /"ContentRoot" "\/b\/windows"/);
  assert.match(vdf, /"Recursive" "1"/);
  assert.match(vdf, /"FileExclusion" "\*\.pdb"/);
});

test("repairs GodotSteam library paths that point at missing files", () => {
  const text = 'macos.release = "res://addons/godotsteam/osx/libgodotsteam.macos.template_release.dylib"\n';
  const exists = (p) => p.endsWith("osx/libgodotsteam.macos.template_release.universal.dylib");
  const out = repairGdextension(text, "/g/addons/godotsteam/godotsteam.gdextension", "/g", exists);
  assert.match(out, /template_release\.universal\.dylib"/);
  assert.equal(repairGdextension(out, "/g/addons/godotsteam/godotsteam.gdextension", "/g", () => true), out);
});

test("sets a project setting inside its section, adding the section when missing", () => {
  const base = 'config_version=5\n\n[application]\n\nconfig/name="X"\n';
  const a = setProjectSetting(base, "rendering", "textures/vram_compression/import_etc2_astc", "true");
  assert.match(a, /\[rendering\]\n\ntextures\/vram_compression\/import_etc2_astc=true\n/);
  const b = setProjectSetting(a, "rendering", "textures/vram_compression/import_etc2_astc", "true");
  assert.equal(b, a);
  const c = setProjectSetting(a, "application", "config/name", '"Y"');
  assert.match(c, /config\/name="Y"/);
  assert.doesNotMatch(c, /config\/name="X"/);
});

test("finds the addon folder inside an unpacked GodotSteam release", () => {
  const dirs = { "/t": ["a"], "/t/a": ["addons", "docs"], "/t/a/addons": ["godotsteam"], "/t/a/docs": ["godotsteam"], "/t/a/addons/godotsteam": [], "/t/a/docs/godotsteam": [] };
  assert.equal(findAddon("/t", (d) => dirs[d] || [], (...p) => p.join("/")), "/t/a/addons/godotsteam");
  assert.equal(findAddon("/t/a/docs", (d) => dirs[d] || [], (...p) => p.join("/")), null);
});

test("setBundleId rewrites the macOS preset and leaves other lines alone", () => {
  const cfg = 'application/name="X"\napplication/bundle_identifier="com.example.x"\ncodesign/codesign=1\n';
  assert.equal(setBundleId(cfg, "com.studio.x"), 'application/name="X"\napplication/bundle_identifier="com.studio.x"\ncodesign/codesign=1\n');
});
