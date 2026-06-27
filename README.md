# 🍼 Tiny Picks — Baby Reveal Surprise App

## What it is

A disguised **pregnancy announcement app**. Your expecting friends (A & S) think they're playing a fun baby gift-picking game for *their* baby. But mid-delivery, the packages split — revealing that **you and your wife are also expecting**. Surprise!

## The Flow (7 screens)

1. **Welcome** — Cycling baby emojis, casual intro ("a tiny human is on the way")
2. **Player Select** — 4 players tap their avatar (anime-style portraits, square with rounded corners)
3. **Shopping Spree** — 60-second timer, pick up to 5 items from 25 quirky baby gifts
4. **Cart Reveal** — 2×2 grid showing what everyone picked
5. **Packing** — 4 individual packages, one per player with avatars
6. **Delivery (THE TWIST)** — Baby universe scene: two custom delivery characters travel together up a forking road in a purple starry space with floating baby emojis. Midway, they split. Maasi/Mausa caps transform into Mom/Dad. "PLOT TWIST — you're ALSO expecting! 🍼"
7. **Final Reveal** — Confetti, BOGO flash, milestone photos + Spider-Man meme with all 4 faces

## Tech Stack

- **Pure HTML/CSS/JS** — no framework, no backend, no build step
- **Single `index.html`** with modular JS files (config, items, game, animations, app)
- **Scrapbook/cutout visual theme** — kraft paper textures, washi tape accents, scattered baby doodles
- **Mobile-first** — designed for phone use (all 4 players would use their phones)
- **DevMode** (`CONFIG.devMode = true` in `js/config.js`) — skips 4-player requirement and auto-fills carts for testing

## File Structure

```
tiny-picks/
├── index.html              # Main app (all 7 screens)
├── README.md               # This file
├── css/
│   └── style.css           # Full theme (~27KB)
├── js/
│   ├── config.js           # Players, teams, caps, devMode flag
│   ├── items.js            # 25 baby gift items with emoji & descriptions
│   ├── game.js             # Game state, timer, package logic
│   ├── animations.js       # Confetti, sleep, fade, typeText utilities
│   └── app.js              # Main controller — all screen transitions & delivery animation
├── assets/
│   ├── avatars/
│   │   ├── you-s.png       # Sarthak anime avatar
│   │   ├── you-a.png       # Wife anime avatar
│   │   ├── friend-s.png    # Friend S anime avatar
│   │   └── friend-a.png    # Friend A anime avatar
│   ├── delivery-boy.png    # Custom "Tiny Picks" delivery boy in teal truck
│   ├── delivery-girl.png   # Custom "Tiny Picks" delivery girl on pink scooter
│   └── minion-*.png        # Original minion assets (legacy, unused)
├── crop-faces.js           # Node utility script for avatar cropping (used sharp)
├── package.json            # Node project with sharp dependency
└── package-lock.json
```

## How to Run Locally

Just open `index.html` in a browser. No server needed.

For testing: append `?dev=1` to URL or ensure `CONFIG.devMode = true` in `js/config.js`.

## How to Deploy

1. Push to GitHub: `github.com/sarthaksahni-108/tiny-picks`
2. Connect repo to Vercel
3. Deploy as static site (no build step needed)
4. Share the URL with friends as "a fun game we made" 😏

## Before Sharing with Friends

- [ ] Set `CONFIG.devMode = false` in `js/config.js`
- [ ] Add real milestone photos to `assets/reveal/`
- [ ] Add ultrasound image
- [ ] Review player names in `js/config.js`
- [ ] Test full 4-player flow end-to-end

## The Concept

Both couples have the same initials (A & S). Both are expecting in the same year. They live in different countries. The friends already know about their own pregnancy — but don't know about yours.

The "twist" works because:
- They think they're picking gifts for their own baby
- The delivery animation shows packages going to TWO addresses
- The "maasi/mausa" (aunt/uncle) caps transform into "mom/dad" caps
- The punchline: "Why would YOU need baby gifts??" → PLOT TWIST reveal

## Credits

- Built with ❤️ using GitHub Copilot CLI
- Anime avatars generated via ChatGPT image generation
- Custom delivery characters designed via ChatGPT
- Inspired by: BOGO shopping concept + Indian family relation dynamics
