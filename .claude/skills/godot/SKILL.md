---
name: godot
description: Making, running and testing Godot 4 games from the command line with godot-steam-kit, on macOS or Windows. Read before creating a game, changing a game's code or scenes, running one, taking screenshots, or writing game tests.
---

# Godot from the command line

## Tools

The pinned version is in the kit's `versions.json`; `steam-kit setup` installs it per machine. `setup` and the kit use their own copy, so examples below write `$GODOT`; point it at that binary or any Godot of the pinned version.

- macOS: `~/.local/godot-steam-kit/godot-<ver>/Godot.app/Contents/MacOS/Godot`.
- Windows: `%LOCALAPPDATA%\godot-steam-kit\godot\Godot_v<ver>-stable_win64_console.exe` (the console build, so output reaches the terminal). Set `GODOT` to override.

Use the same version on every machine. Opening a project in a newer editor rewrites files and the other machine then fights it.

## New game

1. A project folder with a `project.godot` (`config/name`, `run/main_scene`, `config/features=PackedStringArray("4.7")`). Prefer the Compatibility renderer (`renderer/rendering_method="gl_compatibility"`) unless the game needs Forward+: it runs everywhere including older PCs and the Steam Deck.
2. `steam-kit init <game>` from day one, so the Steam path is not a late surprise.

## Running and checking without looking

- Parse and import: `$GODOT --headless --path <game> --import` (fails loudly on script errors).
- Run a scene headless for N frames: `$GODOT --headless --path <game> --quit-after 300`. Read stdout for errors.
- Game-side flags: read `OS.get_cmdline_user_args()` (everything after `--`) for test hooks like `--quit-after-ready`, `--demo` (an attract mode that plays itself), or a scripted state to screenshot.
- Tests: plain GDScript test scenes run headless that print results and `get_tree().quit(code)`; exit code is the verdict. Keep rules logic in plain scripts that can be tested without a scene.

## Seeing it

- `steam-kit shots <game> --seconds 20 --every 4 -- --demo` runs the game with a window and saves 1920x1080 frames to `steam/output/shots/`. It uses Godot's Movie Maker with a temporary `override.cfg` (the frame size follows the viewport only when no window override is set). Read the PNGs to check what the game looks like. A demo or attract mode makes these real gameplay screenshots, which Steam requires.
- `--headless` uses a dummy renderer and cannot produce images.

## Exports

`steam-kit export <game>`; details in the `steam-publishing` skill (`godot-steam.md`).

## Repo hygiene

Commit `project.godot`, scenes, scripts, `*.import` files and `export_presets.cfg`. Never commit `.godot/`. Large binary art and audio: fine in git while small; switch to Git LFS before any single game passes about 200 MB.

## Lessons

Add what was not obvious here.
