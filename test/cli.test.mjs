// Runs the real CLI against a throwaway project. steamcmd and godot are small fake
// scripts that record their arguments, so nothing here touches Steam or the network.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const CLI = fileURLToPath(new URL("../steam-kit.mjs", import.meta.url));
const posix = process.platform !== "win32";

function sandbox() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "steam-kit-test-"));
  const game = path.join(root, "game");
  fs.mkdirSync(path.join(game, "addons/godotsteam"), { recursive: true });
  fs.writeFileSync(path.join(game, "project.godot"), 'config_version=5\n\n[application]\n\nconfig/name="Demo Game"\n');
  const log = path.join(root, "calls.log");
  const fake = (name) => {
    const p = path.join(root, name);
    fs.writeFileSync(p, `#!/bin/sh\necho "$@" >> "${log}"\n`, { mode: 0o755 });
    return p;
  };
  const env = { ...process.env, HOME: root, GODOT: fake("godot"), STEAMCMD: fake("steamcmd"), STEAM_BUILD_ACCOUNT: "example_builder" };
  const run = (...args) => spawnSync(process.execPath, [CLI, ...args], { encoding: "utf8", env });
  const calls = () => (fs.existsSync(log) ? fs.readFileSync(log, "utf8") : "");
  return { root, game, env, run, calls };
}

// What `init` would have left, with real depot ids and one built platform.
function readyToUpload(s) {
  fs.mkdirSync(path.join(s.game, "steam/build/windows"), { recursive: true });
  fs.writeFileSync(path.join(s.game, "steam/build/windows/Demo.exe"), "x");
  fs.writeFileSync(path.join(s.game, "steam/steam.json"), JSON.stringify({
    name: "Demo", appId: 999999, depots: { windows: 1000000, linux: null }, exe: "Demo", bundleId: "com.example.demo", betaBranch: "staging",
  }));
}

function cacheLogin(s) {
  const cfg = process.platform === "darwin"
    ? path.join(s.root, "Library/Application Support/Steam/config/config.vdf")
    : path.join(s.root, "config/config.vdf");
  fs.mkdirSync(path.dirname(cfg), { recursive: true });
  fs.writeFileSync(cfg, '"Accounts" { "Example_Builder" { } }');
}

test("help lists the commands and nothing else", () => {
  const { stdout, status } = spawnSync(process.execPath, [CLI], { encoding: "utf8" });
  assert.equal(status, 0);
  assert.match(stdout, /upload <game>/);
  assert.doesNotMatch(stdout, /import /);
});

test("init writes a config with the test app and an obviously fake bundle id", { skip: !posix }, () => {
  const s = sandbox();
  const r = s.run("init", s.game);
  assert.equal(r.status, 0, r.stderr);
  const cfg = JSON.parse(fs.readFileSync(path.join(s.game, "steam/steam.json"), "utf8"));
  assert.equal(cfg.appId, 480);
  assert.equal(cfg.exe, "DemoGame");
  assert.equal(cfg.bundleId, "com.example.demo-game");
  assert.match(fs.readFileSync(path.join(s.game, "project.godot"), "utf8"), /SteamBootstrap="\*res:/);
  assert.match(fs.readFileSync(path.join(s.game, "export_presets.cfg"), "utf8"), /bundle_identifier="com\.example\.demo-game"/);
  assert.ok(fs.existsSync(path.join(s.game, "steam/LAUNCH.md")));
});

test("export carries steam.json changes made after init into the build inputs", { skip: !posix }, () => {
  const s = sandbox();
  s.run("init", s.game);
  const p = path.join(s.game, "steam/steam.json");
  const cfg = JSON.parse(fs.readFileSync(p, "utf8"));
  fs.writeFileSync(p, JSON.stringify({ ...cfg, appId: 999999, bundleId: "com.studio.demo" }));
  s.run("export", s.game, "linux");
  assert.match(fs.readFileSync(path.join(s.game, "addons/steam_kit/steam_bootstrap.gd"), "utf8"), /^const APP_ID := 999999$/m);
  assert.match(fs.readFileSync(path.join(s.game, "export_presets.cfg"), "utf8"), /bundle_identifier="com\.studio\.demo"/);
});

test("upload refuses the test app id", { skip: !posix }, () => {
  const s = sandbox();
  readyToUpload(s);
  const p = path.join(s.game, "steam/steam.json");
  fs.writeFileSync(p, fs.readFileSync(p, "utf8").replace("999999", "480"));
  cacheLogin(s);
  const r = s.run("upload", s.game);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /480/);
  assert.equal(s.calls(), "");
});

test("upload never reaches steamcmd without a cached login, since it would prompt for a password", { skip: !posix }, () => {
  const s = sandbox();
  readyToUpload(s);
  const r = s.run("upload", s.game);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /no cached steamcmd login/);
  assert.equal(s.calls(), "");
});

test("upload hands steamcmd an absolute script path and writes only the configured depots", { skip: !posix }, () => {
  const s = sandbox();
  readyToUpload(s);
  cacheLogin(s);
  const r = s.run("upload", s.game);
  assert.equal(r.status, 0, r.stderr);
  const script = path.join(s.game, "steam/output/scripts/app_build_999999.vdf");
  assert.equal(s.calls().trim(), `+login example_builder +run_app_build ${script} +quit`);
  assert.match(fs.readFileSync(script, "utf8"), /"SetLive" "staging"/);
  assert.deepEqual(fs.readdirSync(path.dirname(script)).sort(), ["app_build_999999.vdf", "depot_build_1000000.vdf"]);
});

test("upload --live default says the truth: it goes to no branch", { skip: !posix }, () => {
  const s = sandbox();
  readyToUpload(s);
  cacheLogin(s);
  const r = s.run("upload", s.game, "--live", "default");
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /no branch/);
  assert.match(fs.readFileSync(path.join(s.game, "steam/output/scripts/app_build_999999.vdf"), "utf8"), /"SetLive" ""/);
});

test("doctor exits non-zero when the toolchain is missing", { skip: !posix }, () => {
  const s = sandbox();
  const r = s.run("doctor");
  assert.equal(r.status, 1);
  assert.match(r.stdout, /FAIL/);
});
