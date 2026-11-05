# Runbook: one game, project to paid product

Track each game in `<game>/steam/LAUNCH.md`, which `init` creates. Tick phases there as they finish, with dates, so the next session knows where things stand. Commit and push after every phase.

Phases 0 and 2 to 6 are written from Valve's docs. No game has gone through them with this kit yet.

## Phase 0: partner account (once, not per game)

`STUDIO.md` says whether onboarding is done. If not, follow `onboarding.md`. Nothing below Phase 2 can happen before the account exists.

## Phase 1: Steam-ready project (you)

1. `steam-kit init <game>`. Commit.
2. Wire achievements or other Steam features through `SteamBootstrap` (see `godot-steam.md`). Keep the game fully playable when Steam is absent.
3. `steam-kit export <game>`; run the build for this OS; play it headless or with screenshots per the `godot` skill.
4. Decide platforms. Default: Windows plus Linux (covers Steam Deck through Proton and native). Add macOS only if it runs well; listing an OS means the reviewer launches it there.

## Phase 2: App ID (the owner pays)

1. Ask the owner to pay the USD 100 fee for this game. Give them the exact page: Steamworks home, "Create new app" / "Pay app fee". The 30-day clock starts here, so ask as soon as the game is picked, not when it is finished.
2. When the App ID exists, read it and the depot IDs from Steamworks (SteamPipe > Depots; create one depot per OS, set each depot's OS, publish). Write them into `steam/steam.json`, set `appId`, commit.
3. In Steamworks, set Installation > General: one launch option per OS pointing at the exported executable (`<exe>.exe`, `<exe>.x86_64`, `<App name>.app`). Publish.

## Phase 3: store page (you draft, the owner approves)

1. Make the art into `steam/store-assets/` until `steam-kit assets <game>` passes. Screenshots come from real gameplay captures of the exported build.
2. Draft the copy in `<game>/steam/store/` (short description, about, features, tags, content survey answers including AI disclosure, price). Show the owner; this is copy that speaks as the company.
3. After the owner approves, fill the store page in Steamworks in the browser (`store-page.md`), set a release date at least 3 weeks out, and "Mark as ready for review". Record the date in LAUNCH.md.
4. When approved, ask the owner whether to click "Post as Coming Soon" (outward-facing, so it is their call). The two-week Coming Soon clock starts there.

## Phase 4: build (you)

1. `steam-kit upload <game> --preview` to check the scripts, then without `--preview` to land it on the `staging` branch.
2. Install from the staging branch on a real Steam client and check launch, overlay, achievements. Fix and re-upload until clean.
3. Set the build live on the default branch in Steamworks (SteamPipe > Builds). Before release this is safe and needed for review.
4. "Mark as ready for review" on the game build checklist. Record the date.

## Phase 5: release (the owner presses the button)

When fee + 30 days, Coming Soon + 14 days and build approval have all passed, ask the owner to press "Release App" (or ask whether you may press it in the browser while they watch). Price must be set and approved in pricing beforehand (`store-page.md`).

## Phase 6: after release (you)

- Updates: upload to `staging`, test, then set live on default. On a released app this needs a Steamworks login with Steam Guard mobile confirmation, so it is a browser step with the owner signed in, or the owner's click.
- Watch reviews and the Steamworks sales page weekly; draft replies to reviews for the owner.
- First payout arrives about 30 days after the end of the first month over USD 100 (`money.md`). Make sure the accountant gets the monthly report.
