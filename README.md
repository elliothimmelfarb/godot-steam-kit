# godot-steam-kit

A command line tool and a set of agent skills that take a Godot 4 project to a build on a Steam beta branch.

**This kit has never done a real Steam upload.** It has not been used with a real Steamworks account, App ID, depot or cached steamcmd login. The `upload` command has only run against a fake steamcmd in the tests. Expect the first real upload to need debugging.

## What it is

`steam-kit.mjs` is a single Node script with no dependencies. It does the mechanical work:

- `setup` installs the pinned Godot, its export templates and steamcmd into a folder of their own (macOS and Windows).
- `doctor` checks the toolchain and the cached build login.
- `init <game>` adds GodotSteam, a `SteamBootstrap` autoload, export presets, `steam/steam.json` and `steam/LAUNCH.md` to a project.
- `export <game> [windows linux macos]` makes headless release builds in `steam/build/<os>`.
- `shots <game>` captures 1920x1080 frames from a real run of the game.
- `assets <game>` checks store art against Steam's sizes.
- `upload <game> [--preview] [--live <branch>]` writes the SteamPipe scripts and runs steamcmd.

The skills in `.claude/skills/` are plain markdown that tell a coding agent how to carry a game along the whole path: `steam-publishing` covers Steamworks onboarding, the store page, builds, review, release and money, and `godot` covers running and testing a game from the command line. They are written from Valve's docs, checked on 2026-10-30, and from building this kit. They are not written from having shipped a game with it.

The kit will not set a build live on the default branch, will not upload while the App ID is Valve's test app (480), and will not start steamcmd without a cached login, because steamcmd would then ask for a password. The skills tell agents to leave fees, agreements, passwords, bank and tax details, public store copy and the release button to a person.

## How to run it

You need git, Node.js 20 or later, and a Godot 4 project.

```
git clone https://github.com/elliothimmelfarb/godot-steam-kit.git
cd godot-steam-kit
npm link
steam-kit setup
steam-kit doctor
```

`npm link` puts `steam-kit` on your PATH. You can also skip it and run `node path/to/godot-steam-kit/steam-kit.mjs`. `doctor` will report two failures until a build account exists, and the `onboarding.md` page of the `steam-publishing` skill explains how to set one up.

Then, for a project:

```
steam-kit init path/to/game
steam-kit export path/to/game
steam-kit assets path/to/game
steam-kit upload path/to/game --preview
```

`init` writes `com.example.<name>` as the bundle ID and 480 as the App ID. Both are placeholders, so replace them in `steam/steam.json`, along with the depot IDs, once your app exists in Steamworks. `export` carries those values into the project each time it runs.

Set `GODOT` or `STEAMCMD` to use copies you already have. Set `STEAM_BUILD_ACCOUNT` to the name of your build account.

To give an agent working in your game the skills, copy them across:

```
cp -R path/to/godot-steam-kit/.claude/skills/. path/to/game/.claude/skills/
```

On Windows, in PowerShell:

```
Copy-Item -Recurse path\to\godot-steam-kit\.claude\skills\* path\to\game\.claude\skills\
```

Claude Code picks them up from there. Other agents can be pointed at the same files. Copy `templates/STUDIO.md` to your project root to track the Steamworks account.

## What's tested

Run the tests with `npm test`. They are 17 small tests with no network access, and they pass on Node 25.1.0 on macOS. They cover image size reading, the store art rules, the SteamPipe scripts, the GodotSteam path repair, the `project.godot` edits, and the CLI itself. The CLI tests use fake `godot` and `steamcmd` scripts, and they are skipped on Windows.

These were also run for real on 2026-11-05, on an Apple silicon Mac with Godot 4.7.2 and GodotSteam 4.23.2 on a small demo project:

- `setup` in an empty home folder, using an existing copy of the export templates, followed by `doctor`.
- `init`, including the live GodotSteam download.
- `export` of Windows, Linux and macOS builds.
- Launching the macOS build, which loaded GodotSteam and kept running with no Steam client.
- `shots` and `assets`.

## What isn't tested

- Any real Steam upload. `upload` with or without `--preview` has never talked to Valve's servers.
- A real steamcmd login. The path where the kit looks for the cached login on macOS and Windows has never been checked against a real one.
- Whether a failed steamcmd build returns a non-zero exit code. The kit trusts it.
- Running with a live Steam client: the overlay, achievements, `restartAppIfNecessary`, or a Steam-installed copy of a build.
- The exported Windows and Linux builds. They were built on a Mac and never launched.
- Windows as a host. The Windows code paths in `setup`, `init` and `export` have never run.
- Linux as a host. `setup` does not support it, and you install Godot and steamcmd yourself.
- Node versions other than 25.1.0.
- Everything after the build in the skills: partner onboarding, store review, Coming Soon, release and payouts.

GodotSteam is not pinned. `init` takes the newest GodotSteam release, which may not match the pinned Godot in `versions.json`. The macOS library path repair in `lib.mjs` exists because of a packaging bug in 4.23.2.

Valve changes its rules without notice, so recheck `requirements.md` against the linked pages before relying on a date or an amount.

## License

MIT. See `LICENSE`.
