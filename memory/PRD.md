# Kingcom — Product Requirements & Handoff

## Original request and explicit choices
Build a lightweight browser-based open-world pixel community platform called Kingcom, with a central Kingcom hub and token communities created by pasting a contract address. Automatic token metadata, unique community per contract, optional holder access requirements, persistent shared community development and discovery. User selected **Solana**, **Phantom**, **instant guest access**, and a functional foundation with real integrations. Do not label the product a demo or simulation; do not invent financial balances or external-service success.

## Latest authoritative requirements (supersede the original RPG concept)
The user explicitly changed the product several times. The latest requirements are:

> The main Kingcom screen must be a MASSIVE, CONTINUOUS 2D PIXEL OPEN-WORLD MAP. The world is primarily an ENVIRONMENT AND BUILDING MAP.
> DO NOT populate the world with NPCs. DO NOT show other players walking around. DO NOT create RPG characters wandering around. DO NOT create combat, quests, or RPG-style activities.
> The user explores by moving the camera and clicking locations.
> Buildings are the main interactive elements: click a building, show a small prompt, ENTER its interior/interface, EXIT back to the same world.
> Discover empty land, select CREATE TERRITORY, paste a token CA, retrieve metadata, create a territory at that physical location.
> NO NPCs. NO OTHER PLAYERS VISIBLE. NO RPG CHARACTERS. No character levels, inventory, XP, stamina, missions, farming, or resource gathering.

World style: a massive retro internet/meme civilization, NOT a medieval/fantasy RPG, uploaded-image canvas, or separate collection of levels. Wplace inspiration is **scale/community only**. All on-map buildings, trees, roads, monuments, props and vehicles are original native pixel-art game assets, not illustrations/photos placed on a map. Use cohesive visible pixels, outlines, shading, doors/windows, grounded placement, irregular geography and clear open spaces.

## Personas
- Visitor: immediately explores the continent, pans/zooms the camera, enters buildings and saves interesting places.
- Community founder: creates one Solana-token territory on unclaimed land and controls holder-only participation.
- Token holder: verifies Phantom ownership and participates in their community's development.

## Static core requirements
1. One persistent connected continent, camera-only exploration, no character rendering or presence sprites.
2. Native interactive buildings and small entry prompts; meaningful existing interfaces inside buildings.
3. Vast terrain with cities, forests, mountains, beaches, desert, rivers, lakes and connecting roads.
4. Chunk rendering, progressive nearby detail, smooth drag/touch/keyboard pan and zoom, responsive minimal HUD.
5. Kingcom HQ, Community Hall, World Registry, Marketplace, Explore Center and Collection Hall as real buildings.
6. Token territories physically occupy shared coordinates and remain visible on the map.
7. Select open land to claim a territory; server validates land and prevents duplicate mint/plot allocation.
8. Real metadata and real server-verified optional holder gates; public map viewing never requires token ownership.
9. Shared community support/progression changes actual native territory buildings as milestones are reached.
10. Saved places are bookmarks, not an RPG inventory.

## Architecture
- React 19 + existing Shadcn/Radix panels; DM Sans and Pixelify Sans typography. Overlays are building interiors/interfaces, not separate map instances.
- Phaser 3.90 **Canvas renderer**. `WorldScene.js` has a camera focus, no avatar, no NPCs, no remote-player sprite layer. Drag/swipe/keyboard/pad pan the camera; world-space building hit tests produce entry prompts.
- Initial continent extent: 65,536 × 65,536 coordinates. 512-unit chunks; deterministic seed 42069. Only nearby chunks are drawn and textures are disposed when out of range. Geography and native sprite assets generated once/on-demand; no background map image.
- `sprites.js`: native shared-pixel-scale structures, including HQ, shops, houses, bank, gallery, lab, token exchange, frog/dog houses, stonk tower, signal tower, moon station, monuments, trees, parked vehicles and street props.
- `geography.js` / `chunks.js`: shared fixed geography plus persisted territory coordinates. Coarse overview/minimap depicts the same continent.
- FastAPI + MongoDB (existing MONGO_URL and DB_NAME). Data: worlds, players, places, memberships, contributions, token_cache, challenges, counters.
- Guest identity: random bearer token, hashed server-side, browser local storage. Saved camera coordinates and places are per guest. Accounts are not yet recoverable across browsers/devices.
- Token metadata: live public DexScreener, cached server-side, exact case-sensitive Solana mint identity. Unsupported/unindexed tokens produce honest errors.
- Phantom: injected provider connect/signMessage; server-generated expiring nonce; atomic single-use challenge; Ed25519 verification; finalized Solana mint-filtered token-account balances with Decimal math. Public RPC rate limits fail closed. No transactions or trading/funds APIs.
- Land allocation: 2048-cell allocation lattice, organic visible boundaries. Server checks coast/water/mountains/highway/capital/occupied territory; unique mint and plot indexes. Selected coordinates retained; header creation can find available land automatically.
- Buildings such as Meme Bank/Token Exchange are wallet/community-discovery interfaces, **not financial custody, payments or exchange engines**. No financial balances are invented.

## Implemented — 2026-10-02
- Initial Solana guest backend, token discovery, contract uniqueness, holder access, contribution limits and creator policies.
- Replaced original fantasy bitmap map with a chunk-rendered retro native pixel continent.
- Replaced playable avatars with **camera-only exploration** per final user direction. Removed character assets/UI, cosmetic editing, collectible API, RPG inventory and remote-player response/rendering.
- Original native pixel structures in modern/meme architecture; no external image assets are used as buildings or world backdrops.
- Click-building entry prompts, HQ directory, Community Hall rankings, World Registry creation, marketplace discovery, map center, news bulletin, wallet access, landmark details.
- Collection Hall stores/removes/visits building and landmark bookmarks, persisted and isolated by guest identity.
- Empty-land map selection, server validation, snapped plot highlight, CA lookup and physical territory creation; immediate local chunk refresh plus shared periodic world refresh.
- Initial communities: BONK, WIF, POPCAT and JUP, with genuine persisted visit/support counts; existing data preserved through redesigns.
- Full world map, minimap, geographic region names, pan/zoom, desktop/mobile controls and settings persistence.
- Fixed rendering-throughput-dependent movement by using Canvas rendering and real elapsed time. Guarded stale/synthetic pointer capture. Name-only profile input and public map viewing remain independent of holder gating.
- Fixed camera restore: valid low coordinates and exact zero are not mistaken for legacy coordinates.

## Validation status
- Iteration 1: original backend 8/8; identified frame-dependent motion and unsafe pointer capture, both fixed and verified (270 coordinates in 1 second on desktop/mobile for the now-superseded character implementation).
- Iteration 2: updated no-RPG backend 10 passed, 1 skipped because tests temporarily exhausted available token candidates. Building click/enter/exit, saved places CRUD, territory creation/uniqueness, metadata, gating, auth signatures, settings, native canvas and no-overflow passed on desktop 1920×800 and mobile 390×844.
- Critical camera restore issue from iteration 2 fixed and verified: both (5000,5000) and exact (0,0) survive browser reload without changing stored coordinates. Final screenshots show no horizontal overflow at 1920×800 or 390×844. Mobile native HQ click → Enter → Exit passes.
- Previously skipped ownership/contribution test rerun independently: **1 passed in 2.36s** (`test_reports/pytest/focused_contribution.xml`). Together with the main iteration, all 11 distinct current backend test cases have passed.
- Phantom extension-specific signing UI cannot be exercised here. Server Ed25519 and replay rejection are automated; a real wallet extension/in-app browser is needed for the genuine wallet UX.

## Prioritized backlog
### P0
- No known remaining blocker after focused verification. Keep final no-character/no-RPG scope authoritative.
### P1
- Community-controlled placement/customization of approved native building assets within owned territory.
- Cross-device wallet-linked account recovery/ownership continuity, with explicit consent and secure identity handling.
- Optional dedicated RPC configuration if public Solana rate limits become frequent; currently failures are explicit and safe.
### P2
- Expand the geography bounds/overview as more territories join; the rendering foundation is chunk-based.
- Richer building-specific community interiors and additional native architectural variants.
- More community moderation controls and bookmarked-place sharing.

## Next tasks
Preserve the clean environment-and-building experience. Improve collaborative territory customization next; do not reintroduce avatars, wandering actors, fantasy castles, inventory or XP systems. Do not add fake bank, casino or trading functionality merely because a building has a playful name.

## Final verification artifacts
- `test_reports/iteration_2.json`: comprehensive latest-scope test findings before final persistence fix.
- `test_reports/final_verification.json`: resolved finding and focused post-fix checks.
- `test_reports/pytest/pytest_results.xml`: main API test run.
- `test_reports/pytest/focused_contribution.xml`: independently passing previously skipped test.
