<div align="center">

# ✊📄✂️ Neon Rock Paper Scissors Arena

**A modern, interactive Rock-Paper-Scissors game with a neon UI, smooth animations, an adaptive AI opponent, and real-time game tracking.**

[![HTML5](https://img.shields.io/badge/HTML5-structure-E34F26?logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-neon%20%26%20animations-1572B6?logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![JavaScript](https://img.shields.io/badge/JavaScript-game%20engine-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Node.js](https://img.shields.io/badge/Node.js-optional%20server-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](#-license)

</div>

---

## 🚀 Live Preview

Open [`index.html`](index.html) — it redirects straight into the main game.

## ✨ Features

| Category | Details |
|---|---|
| ⚡ **Neon UI** | Glassmorphism + neon-glow design with smooth animations |
| 🎯 **Difficulty Levels** | Easy, Medium, and Hard |
| 🤖 **AI Opponent** | Adaptive behavior based on selected difficulty |
| 📊 **Leaderboard** | Persisted locally via browser storage |
| 📜 **Game History** | Every round tracked in real time |
| 🔥 **Win Streaks** | Streak tracking and display |
| 🎨 **Theming** | Dark / light mode toggle |
| 💥 **Visual Effects** | Particle and ripple animations, animated counters |

## ⌨️ Keyboard Controls

| Key | Action |
|---|---|
| `R` | Rock |
| `P` | Paper |
| `S` | Scissors |
| `T` | Toggle theme |

## 🧩 Tech Stack

- **Frontend:** HTML, CSS, JavaScript
- **Backend (optional):** Node.js
- **Storage:** Browser Local Storage

## 📁 Project Structure

```
Rock-Paper-Scissors-Game/
├── index.html        Redirect entry point
├── rock.html         Main game UI
├── scissors.css       Styling & animations
├── paper.js           Game logic & UI control
├── animations.js       Visual effects
├── game-engine.js      Core game rules & AI
├── storage.js          Local storage / leaderboard handling
├── server.js           Optional Node.js server
└── package.json        Project config
```

## ⚙️ Installation & Setup

### 1 · Clone the repository

```bash
git clone https://github.com/Himagirisiddesh/Rock-Paper-Scissors-Game.git
cd Rock-Paper-Scissors-Game
```

### 2 · Run locally (simple)

Just open `index.html` in your browser.

### 3 · Run with Node.js (recommended)

```bash
npm install
npm start
```

Then open **`http://127.0.0.1:3000`**

## 🧠 Game Logic

1. Player selects 🪨 Rock, 📄 Paper, or ✂️ Scissors
2. The AI generates a move based on the chosen difficulty
3. Outcome is decided by classic rules:
   - Rock beats Scissors
   - Paper beats Rock
   - Scissors beats Paper
4. Scores, streaks, and history update instantly

## 🎨 UI Highlights

- Glassmorphism + neon glow design
- Particle and ripple animations
- Interactive buttons with hover effects
- Smooth transitions and animated counters


## 📌 Future Improvements

- 🌐 Multiplayer mode
- 🏆 Online leaderboard
- 📱 Deeper mobile optimization
- 🔊 Sound effects

## 🤝 Contributing

Contributions are welcome — feel free to fork and improve the project:

```bash
git checkout -b feature-name
git commit -m "Added new feature"
git push origin feature-name
```

Then open a pull request.

## 📄 License

This project is licensed under the [MIT License](LICENSE).

## 👨‍💻 Author

**Himagiri Siddesh M**
💼 MCA Student · 💻 Developer · 🤖 AI Enthusiast

## ⭐ Support

If you like this project, consider starring ⭐ the repository and sharing it with others!

---

<div align="center">
Built with HTML, CSS, and JavaScript
</div>
