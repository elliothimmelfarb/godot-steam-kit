# One-time onboarding: your company as a Steamworks partner

Mostly the owner's hands, because it is agreements, money, bank, tax and identity. Your job: prepare every value, open the right page, and track state in `STUDIO.md`.

Valve's steps here have not been walked through with this kit. They come from Valve's docs.

## Accounts

1. **Studio Steam account** (the owner creates; agents never create accounts): a Steam account on a company address such as `studio@example.com`, with Steam Guard through the Steam Mobile app. This one signs up for Steamworks and holds Actual Authority. Keep it separate from a personal gaming account so the company owns it.
2. **Build account** (the owner creates, after onboarding): a second Steam account used only by steamcmd, e.g. `example_builder`, with email Steam Guard. In Steamworks > Users & Permissions, add it to your group with only "Edit App Metadata" and "Publish App Changes To Steam". Valve recommends exactly this. [uploading](https://partner.steamgames.com/doc/sdk/uploading)
3. **Cached login, once per machine:** the owner runs `steamcmd +login example_builder` in a terminal on that machine and types the password and the Steam Guard code from email. After that steamcmd logs in with the name alone and the kit can upload. Set `STEAM_BUILD_ACCOUNT=example_builder` in the shell profile (macOS `~/.zshrc`; Windows `setx STEAM_BUILD_ACCOUNT example_builder`). Changing the account's email or phone blocks setting builds live on released apps for 3 days.

## Partner signup at partner.steamgames.com (the owner, signed in as the studio account)

Gather these first. The examples are fake.

| Field | Example | Where it comes from |
|---|---|---|
| Legal company name | Example Games Ltd | your company registration |
| Company form | private limited company | your company registration |
| Address | 1 Example Street, Exampletown | registered office |
| Tax ID for a treaty claim | your national tax number | your tax authority |
| Bank | a business account in the company's name, IBAN and SWIFT | your bank |
| Tax form | W-8BEN-E style interview, entity, your country, claim treaty benefits if one applies | `money.md` |

Order (from Valve): agreements, app fee, bank, tax interview, identity. Tax verification can take up to 30 days and tax info is locked while it runs, so get it right first time.

You may drive a browser the owner has signed in to, to navigate, read status and fill non-secret fields like company name and address. The owner types the bank numbers, tax ID and identity documents, and accepts agreements and payment.

## When done

Write the state into `STUDIO.md`: onboarding date, verification status, withholding rate shown under Users & Permissions > Company Details, build account name, which machines have a cached login.
