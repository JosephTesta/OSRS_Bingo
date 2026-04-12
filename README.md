# OSRS Bingo Boss Event

## Setup

Run all commands from inside the `osrs-bingo/` folder.

### 1. Install dependencies
```
npm install
```

### 2. Download boss images
```
node download-bosses.mjs
```
Downloads 19 boss PNGs from the OSRS wiki into `public/bosses/`.
Requires Node 18 or newer.

### 3. Start the dev server
```
npm run dev
```
Open http://localhost:5173

---

If any images fail to download, save them manually from:
https://oldschool.runescape.wiki/w/Special:FilePath/<filename>
into `public/bosses/` using the boss id as the name (e.g. `vorkath.png`).
"# OSRS_Bingo" 
