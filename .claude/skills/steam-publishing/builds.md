# Builds and branches

The upload half of this page is written from Valve's docs and has never run against real Steam. Expect to correct it, and do correct it.

## The flow

```
steam-kit export <game>            # steam/build/{windows,linux,macos}
steam-kit upload <game> --preview  # logs and manifest only, uploads nothing
steam-kit upload <game>            # uploads, sets live on steam.json "betaBranch" (staging)
```

The kit writes `steam/output/scripts/app_build_<appId>.vdf` and one `depot_build_<depotId>.vdf` per OS, then runs `steamcmd +@NoPromptForPassword 1 +login $STEAM_BUILD_ACCOUNT +run_app_build ... +quit`. The flag makes steamcmd fail instead of asking for a password. It has not been tried against a real upload.

## Rules

- **The default branch cannot be set live from steamcmd.** Valve blocks it; the kit drops `--live default` on purpose and says "no branch". Promote in Steamworks > SteamPipe > Builds (`partner.steamgames.com/apps/builds/<appId>`).
- Create the `staging` branch once in SteamPipe > Builds, password protected, before the first upload.
- On a released app, setting a build live needs Steam Guard confirmation, so it happens in the browser with the owner signed in, or by the owner.
- Never type the build account password. If the kit says there is no cached login, give the owner the one command it prints.
- `steam_appid.txt` and `*.pdb` never ship (excluded in the depot script).

## steam.json

```json
{ "name": "Example Game", "appId": 480, "depots": { "windows": null, "linux": null, "macos": null },
  "exe": "ExampleGame", "bundleId": "com.example.example-game", "betaBranch": "staging" }
```

480 is Valve's SpaceWar test app; the kit refuses to upload while it is set. A `null` depot is skipped, which is how you ship without macOS. `init` writes `com.example.<slug>` as a placeholder, so set your own `bundleId`; `export` copies `appId` and `bundleId` into the project on every run.

## Where steamcmd lives

- macOS: `~/.local/godot-steam-kit/steamcmd/steamcmd.sh`. The kit expects the login cache at `~/Library/Application Support/Steam/config/config.vdf`; no real login has confirmed that path.
- Windows: `%LOCALAPPDATA%\godot-steam-kit\steamcmd\steamcmd.exe`, login cache in its `config\config.vdf`. Not yet run on Windows.
- Set `STEAMCMD` or `GODOT` to use your own copies.

Source: [uploading](https://partner.steamgames.com/doc/sdk/uploading).
