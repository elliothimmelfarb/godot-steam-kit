# Godot and Steam

## GodotSteam

`steam-kit init` installs the newest GodotSteam GDExtension from Codeberg (`codeberg.org/godotsteam/godotsteam`, tags ending `-gde`) into `addons/godotsteam`. It works with the stock Godot editor and templates; no custom build. The version is not pinned, so a later release can differ from what the kit was tested with (4.23.2).

- **Packaging bug, 4.23.2 (2026-10-20):** its `.gdextension` names `osx/libgodotsteam.macos.template_*.dylib`, but the files ship as `*.universal.dylib`. The macOS export then fails to load the extension. `init` repairs the paths (`repairGdextension` in `lib.mjs`). Drop this note when a release fixes it.
- Export copies the GodotSteam library and `steam_api64.dll` / `libsteam_api.so` / `libsteam_api.dylib` next to the executable automatically. Verified 2026-11-05 for all three.

## SteamBootstrap autoload

`addons/steam_kit/steam_bootstrap.gd`, registered as `SteamBootstrap`:

- Initialises Steam with `steamInitEx(APP_ID)` and pumps `run_callbacks()` every frame, even while paused.
- `APP_ID` is rewritten from `steam.json` on every export.
- Release builds of a real App ID started outside Steam relaunch through Steam (`restartAppIfNecessary`).
- Without Steam (editor, tests, no client running) it logs and the game runs normally: `SteamBootstrap.enabled` is false.
- Achievements: define them in Steamworks > Stats & Achievements, then `SteamBootstrap.unlock("API_NAME")`.

Verified 2026-11-05: the exported macOS build loads GodotSteam and reports "Could not determine Steam client install directory" cleanly when no client runs.

## Platforms

- **Windows** is the main market. Export from either machine.
- **Linux / Steam Deck:** ship the Linux build; the Deck also runs Windows builds through Proton. Use the Compatibility renderer or check Forward+ runs on the Deck. "Steam Deck Verified" review is requested in Steamworks after release and is optional.
- **macOS:** Steam does not require notarization for games launched through Steam (GodotSteam docs, 2026-08); the kit ad-hoc signs. Proper signing and notarization need an Apple Developer membership (USD 99 a year, so ask the owner). Ship macOS only after testing the build on a Mac.
- Universal macOS exports require `rendering/textures/vram_compression/import_etc2_astc=true`; `init` sets it.
