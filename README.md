# UNO Card Game

A browser-based UNO card game built with Angular 18. Play against an AI opponent with real-time sound effects, animated notifications, and a sleek dark-themed UI.

## Features

- **Single-player vs AI** — Play against a strategic bot that analyzes your hand and adapts its moves
- **Full UNO rules** — Skip, Reverse, Draw 2, Wild, and Wild Draw 4 cards with stacking mechanics
- **Sound effects** — Synthesized audio feedback for card plays, action cards, UNO calls, and win/loss
- **Animated UI** — Card hover effects, turn indicators, animated notifications, confetti on win
- **No login required** — Open the page and start playing instantly
- **Responsive design** — Works on desktop and mobile browsers

## Development

### Prerequisites

- Node.js 20+
- npm

### Setup

```bash
npm install
```

### Development server

```bash
npm start
```

Navigate to `http://localhost:4200/`. The app auto-reloads on source changes.

### Build

```bash
npm run build
```

Production build with base-href configuration:

```bash
npm run deploy
```

Build artifacts go to `dist/uno-game/browser/`.

### Running tests

```bash
npm test
```

## Deployment

The project includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that automatically builds and deploys to GitHub Pages on every push to `master`.

1. Push to `master`
2. Go to repo **Settings → Pages** and set **Source** to **GitHub Actions**
3. The app is live at `https://suhruthy.github.io/UnoCardGame/`

## Tech Stack

- [Angular 18](https://angular.dev/) — Framework
- [Angular Signals](https://angular.dev/guide/signals) — Reactive state management
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) — Synthesized sound effects
- [GitHub Actions](https://github.com/features/actions) — CI/CD pipeline
- [GitHub Pages](https://pages.github.com/) — Hosting

## Project Structure

```
src/
├── app/
│   ├── components/
│   │   ├── card/             # Individual UNO card display
│   │   ├── color-picker/     # Wild card color selection modal
│   │   ├── game-board/       # Main game interface and logic
│   │   ├── home/             # Landing page with rules
│   │   └── player-hand/      # Player's hand of cards
│   ├── models/               # Card, Player, GameState interfaces
│   └── services/
│       ├── game.service.ts   # Core game logic, AI, state management
│       └── sound.service.ts  # Web Audio API sound synthesis
├── styles.css                # Global styles
└── index.html                # Entry point
```

## License

MIT
