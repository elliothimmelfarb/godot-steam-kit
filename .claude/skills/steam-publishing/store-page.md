# Store page

## Art (put in `<game>/steam/store-assets/`, check with `steam-kit assets`)

File stems are fixed so the checker finds them; `.png` or `.jpg`.

| File stem | Size | Rule |
|---|---|---|
| `header_capsule` | 920x430 | key art plus logo, no text beyond the title |
| `small_capsule` | 462x174 | logo nearly fills it, legible at 120x45 |
| `main_capsule` | 1232x706 | key art plus logo |
| `vertical_capsule` | 748x896 | key art plus logo |
| `page_background` | 1438x810 | optional, ambient |
| `library_capsule` | 600x900 | key art plus logo |
| `library_header` | 920x430 | optional, falls back to header capsule |
| `library_hero` | 3840x1240 | no text at all; keep the subject in the centred 860x380 |
| `library_logo` | PNG with transparency, 1280 wide or 720 tall | logo only |
| `screenshots/*` | 16:9, at least 1920x1080, at least 5 | gameplay only; no concept art, captions or awards |

Sources: [standard assets](https://partner.steamgames.com/doc/store/assets/standard), [library assets](https://partner.steamgames.com/doc/store/assets/libraryassets). Client and community icons, and the trailer (optional but strongly helps), have their own pages under `/doc/store/assets`.

Screenshots: capture from the exported build at 1920x1080 (see the `godot` skill for headless capture). Mark at least 4 as suitable for all ages when uploading.

## Copy (draft in `<game>/steam/store/`, the owner approves)

- Short description (about 300 characters), the "About this game" body, features list, supported languages, tags, system requirements per OS.
- No links to other sites, no features that are not in the build, future features marked as not yet released.
- Content survey: violence, mature themes, and the AI disclosure (`requirements.md`).
- Plain and specific, in the studio's own voice.

## Pricing

Set in Steamworks > Pricing with Valve's recommended regional prices from a USD base; the owner approves the base price (it is money). Releasing needs "Manage pricing and discounts" permission.

## Filling the page

There is no API for store page content. Use a browser where the owner has signed in to Steamworks. Upload art through the page's file inputs. Save as you go; nothing is public until review and "Post as Coming Soon".

## Lessons

Add what reviewers bounced, and why, here.
