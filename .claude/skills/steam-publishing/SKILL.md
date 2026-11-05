---
name: steam-publishing
description: How to take a Godot 4 game to a released, paid Steam product with godot-steam-kit. Read before any Steam work: Steamworks onboarding, the app fee, the store page and its art, uploading builds with steamcmd, review, Coming Soon, release, pricing, payouts and tax. Also read when asked "where are we with X on Steam" or "ship X".
---

# Steam publishing

The path for one game, start to finish, and what each step needs. The kit (`steam-kit`) does the mechanical parts; this skill is the judgment around it.

**How far this is proven.** The kit has never done a real Steam upload. `init`, `export`, `shots`, `assets`, `setup` and `doctor` have been run for real on macOS. `upload` has only run against a fake steamcmd, and the steps from Phase 0 on come from reading Valve's docs, not from shipping a game. Treat the first real upload as debugging, tell the owner what you find, and add it to `builds.md`.

Commands below write `steam-kit`. That is `npm link` from the kit repo, or `node <path to godot-steam-kit>/steam-kit.mjs`. `<game>` is the folder with `project.godot`. "The owner" is the person who holds the Steamworks account.

## Read in this order

1. `STUDIO.md` in the project root, copied from the kit's `templates/STUDIO.md`: is the partner account onboarded, which App IDs exist, is the build login cached.
2. The game's `steam/LAUNCH.md`, which `init` creates: where that game is on the path.
3. The topic file for the step you are on.

## Topic files

- `requirements.md`: Valve's rules as checked on 2026-10-30, with sources: fee, waiting periods, review times, content rules, AI disclosure.
- `runbook.md`: the per-game path, phase by phase, with who does what and the timeline math. Start here for "ship X".
- `onboarding.md`: the one-time partner account setup and the build account. Mostly the owner's hands; you prepare.
- `store-page.md`: art sizes, copy rules, the content survey, pricing, and how to fill the page in the browser.
- `builds.md`: steamcmd, depots, branches, the cached login, setting builds live.
- `godot-steam.md`: GodotSteam, the bootstrap autoload, achievements, Steam Deck, macOS signing.
- `money.md`: revenue share, payouts, withholding, VAT.

## What needs the owner (and only this)

Paying fees, accepting agreements, typing passwords, bank, tax or identity details, approving store copy before it goes public, and pressing Release. Everything else, carry end to end and report.
