# Valve's requirements (checked 2026-10-30)

Recheck a rule against its source before relying on it for a date or money decision; Valve edits these pages without notice.

## Account and fee

- **Steam Direct fee:** USD 100 per product, non-refundable, paid with any Steam payment method except Steam Wallet. Recouped in the payout once the product passes USD 1,000 adjusted gross revenue. [steamdirect](https://partner.steamgames.com/steamdirect)
- **Order of onboarding:** sign NDA and Steam Distribution Agreement, pay the fee, then bank, tax and identity. Tax verification by a third party can take up to 30 days; Valve says 15 to 30 days for verification overall. [onboarding](https://partner.steamgames.com/doc/gettingstarted/onboarding)
- **Company:** sign up under the legal entity that owns the game (your company), no trade names. Name must match bank and tax records. The bank must be a business account in that name.

## Timing rules for the first few titles

- **Waiting period after paying the fee:** the Steam Direct page says 30 days, the onboarding page says 21. Plan on 30.
- **Coming Soon page:** public for at least 2 weeks before release. Once Coming Soon is live and the date is within 14 days, the date can only change by contacting Valve. [coming_soon](https://partner.steamgames.com/doc/store/coming_soon)
- **Review:** store page and build each take 3 to 5 business days; submit at least 7 business days before you need it. The build can be submitted only after the store page has been. [review_process](https://partner.steamgames.com/doc/store/review_process)
- **Release** is a manual green "Release App" button on the app's landing page in Steamworks. Releasing needs the permissions "Publish app changes to Steam" and "Manage pricing and discounts". [releasing](https://partner.steamgames.com/doc/store/releasing)

So the earliest release is the latest of: fee + 30 days, Coming Soon + 14 days, build approved.

## What reviewers check

- Store page: capsules with a readable title or logo, screenshots of gameplay only, a coherent detailed description with no external links, no unfinished features shown as present.
- Build: launches on every OS the page lists, every feature listed on the page is in it, any in-game purchase uses Steam Wallet.

## Content rules

- No advertising-based business models, no crypto or NFT features, no content you lack rights to. [steamdirect](https://partner.steamgames.com/steamdirect)
- **AI disclosure (content survey):** since the January 2026 rewrite, disclose AI-generated content that players consume (art, audio, text, voice shipped in the game or on the store page). Coding assistants and other behind-the-scenes tools are exempt. Live-generated AI content needs a description of guardrails, and players get an overlay report button. In practice, code written with an assistant is exempt; disclose any generated art, music, voice or text that ships. [Game Developer](https://gamedeveloper.com/business/valve-tweaks-and-clarifies-ai-disclosure-rules-for-steam), [PC Gamer](https://www.pcgamer.com/software/ai/steam-updates-ai-disclosure-form-to-specify-that-its-focused-on-ai-generated-content-that-is-consumed-by-players-not-efficiency-tools-used-behind-the-scenes/)
- Adult content needs its own labels and longer review; avoid unless planned.

## Store art (exact sizes)

See `store-page.md`. The kit's `assets` command enforces them.
