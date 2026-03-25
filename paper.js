import {
  CHOICES,
  DIFFICULTY_META,
  OUTCOME_META,
  GameEngine,
} from "./scripts/game-engine.js";
import { EffectsDirector, createChoiceIcon } from "./scripts/animations.js";
import { StorageController } from "./scripts/storage.js";

const OUTCOME_CLASSES = ["is-win", "is-lose", "is-draw"];
const wait = (duration) => new Promise((resolve) => window.setTimeout(resolve, duration));

const createSessionId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `session-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
};

const capitalize = (value) => value.charAt(0).toUpperCase() + value.slice(1);

const formatTime = (isoString) =>
  new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(isoString));

const getStreakMessage = (streak) => {
  if (streak <= 0) {
    return "Build momentum to light up the arena.";
  }

  if (streak === 1) {
    return "Momentum started. One more win unlocks combo energy.";
  }

  if (streak <= 3) {
    return `${streak}x combo online. The arena is amplifying your rhythm.`;
  }

  return `${streak}x combo. You're in full highlight-reel territory now.`;
};

const removeOutcomeClasses = (element) => {
  if (!element) {
    return;
  }

  element.classList.remove(...OUTCOME_CLASSES);
};

const applyOutcomeClass = (element, outcome) => {
  removeOutcomeClasses(element);

  if (outcome && outcome !== "idle") {
    element.classList.add(`is-${outcome}`);
  }
};

const renderEmptyState = (message, tagName = "div") =>
  `<${tagName} class="empty-state">${message}</${tagName}>`;

const renderHistoryItem = (entry) => `
  <article class="history-item">
    <div class="history-item__top">
      <span class="history-item__title">Round ${entry.round}</span>
      <span class="history-item__meta">${formatTime(entry.timestamp)}</span>
    </div>
    <div class="history-item__chips">
      <span class="history-item__chip is-${entry.outcome}">${capitalize(entry.outcome)}</span>
      <span class="history-item__chip">${entry.userChoice} vs ${entry.cpuChoice}</span>
      <span class="history-item__chip">${entry.difficultyLabel}</span>
    </div>
    <div class="history-item__meta">${entry.statement}</div>
  </article>
`;

const renderLeaderboardItem = (entry, index) => `
  <li class="leaderboard-entry">
    <div class="leaderboard-entry__top">
      <span class="leaderboard-entry__rank">#${index + 1}</span>
      <div>
        <div class="leaderboard-entry__title">${entry.userScore} Wins - ${entry.bestStreak}x Best Streak</div>
        <div class="leaderboard-entry__meta">
          ${entry.difficultyLabel} - ${entry.rounds} rounds - Updated ${formatTime(entry.updatedAt)}
        </div>
      </div>
    </div>
    <div class="leaderboard-entry__meta">CPU ${entry.cpuScore} - Draws ${entry.draws}</div>
  </li>
`;

const boot = () => {
  const elements = {
    appShell: document.getElementById("app-shell"),
    loadingScreen: document.getElementById("loading-screen"),
    ambientCanvas: document.getElementById("ambient-canvas"),
    fxCanvas: document.getElementById("fx-canvas"),
    metaThemeColor: document.querySelector('meta[name="theme-color"]'),
    userScore: document.getElementById("user-score"),
    cpuScore: document.getElementById("cpu-score"),
    drawScore: document.getElementById("draw-score"),
    streakCount: document.getElementById("streak-count"),
    streakLabel: document.getElementById("streak-label"),
    roundCount: document.getElementById("round-count"),
    bestStreak: document.getElementById("best-streak"),
    themeLabel: document.getElementById("theme-label"),
    difficultyLabel: document.getElementById("difficulty-label"),
    difficultyBadge: document.getElementById("difficulty-badge"),
    helperText: document.getElementById("helper-text"),
    gameStatus: document.getElementById("game-status"),
    playerCard: document.getElementById("player-card"),
    cpuCard: document.getElementById("cpu-card"),
    playerChoiceDisplay: document.getElementById("player-choice-display"),
    cpuChoiceDisplay: document.getElementById("cpu-choice-display"),
    playerChoiceLabel: document.getElementById("player-choice-label"),
    cpuChoiceLabel: document.getElementById("cpu-choice-label"),
    playerSubcopy: document.querySelector("#player-card .combatant__subcopy"),
    cpuSubcopy: document.querySelector("#cpu-card .combatant__subcopy"),
    versusStage: document.getElementById("versus-stage"),
    vsBadge: document.getElementById("vs-badge"),
    leaderboardList: document.getElementById("leaderboard-list"),
    historyList: document.getElementById("history-list"),
    toast: document.getElementById("toast"),
    resultOverlay: document.getElementById("result-overlay"),
    overlayBackdrop: document.querySelector(".overlay__backdrop"),
    popupBadge: document.getElementById("popup-badge"),
    popupTitle: document.getElementById("popup-title"),
    popupCopy: document.getElementById("popup-copy"),
    popupStreak: document.getElementById("popup-streak"),
    popupDifficulty: document.getElementById("popup-difficulty"),
    popupRounds: document.getElementById("popup-rounds"),
    popupClose: document.getElementById("popup-close"),
    nextRound: document.getElementById("next-round"),
    clearHistory: document.getElementById("clear-history"),
    resetSession: document.getElementById("reset-session"),
  };

  const choiceButtons = Array.from(document.querySelectorAll(".choice-card"));
  const difficultyButtons = Array.from(document.querySelectorAll("[data-difficulty]"));
  const themeButtons = Array.from(document.querySelectorAll("[data-theme-target]"));
  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;

  const storage = new StorageController();
  const preferences = storage.loadPrefs();
  const engine = new GameEngine({ difficulty: preferences.difficulty });
  const effects = new EffectsDirector({
    ambientCanvas: elements.ambientCanvas,
    fxCanvas: elements.fxCanvas,
    reducedMotion: reduceMotion,
  });

  let sessionId = createSessionId();
  let overlayOpen = false;
  let roundLocked = false;
  let roundSequence = 0;
  let displayedNumbers = {
    userScore: 0,
    cpuScore: 0,
    draws: 0,
    streak: 0,
    bestStreak: 0,
    rounds: 0,
  };

  const persistPreferences = () => {
    storage.savePrefs(preferences);
  };

  const renderChoiceIcons = () => {
    document.querySelectorAll("[data-icon-slot]").forEach((slot) => {
      slot.innerHTML = createChoiceIcon(slot.dataset.iconSlot);
    });

    elements.playerChoiceDisplay.innerHTML = createChoiceIcon();
    elements.cpuChoiceDisplay.innerHTML = createChoiceIcon();
  };

  const updateThemeButtons = (theme) => {
    themeButtons.forEach((button) => {
      button.classList.toggle("is-active", button.dataset.themeTarget === theme);
    });

    elements.themeLabel.textContent = theme === "dark" ? "Dark" : "Light";
    document.documentElement.dataset.theme = theme;

    if (elements.metaThemeColor) {
      elements.metaThemeColor.setAttribute("content", theme === "dark" ? "#08111f" : "#eff7ff");
    }
  };

  const updateDifficultyButtons = (difficulty) => {
    difficultyButtons.forEach((button) => {
      button.classList.toggle("is-active", button.dataset.difficulty === difficulty);
    });

    const label = DIFFICULTY_META[difficulty].label;
    elements.difficultyLabel.textContent = label;
    elements.difficultyBadge.textContent = label;
  };

  const updateCounters = ({ userScore, cpuScore, draws, streak, bestStreak, rounds }) => {
    effects.animateCounter(elements.userScore, displayedNumbers.userScore, userScore);
    effects.animateCounter(elements.cpuScore, displayedNumbers.cpuScore, cpuScore);
    effects.animateCounter(elements.drawScore, displayedNumbers.draws, draws);
    effects.animateCounter(elements.streakCount, displayedNumbers.streak, streak, { suffix: "x" });
    effects.animateCounter(elements.bestStreak, displayedNumbers.bestStreak, bestStreak, { suffix: "x" });
    effects.animateCounter(elements.roundCount, displayedNumbers.rounds, rounds);

    displayedNumbers = {
      userScore,
      cpuScore,
      draws,
      streak,
      bestStreak,
      rounds,
    };
  };

  const updateCombatants = (round = null) => {
    if (!round) {
      elements.playerChoiceDisplay.innerHTML = createChoiceIcon();
      elements.cpuChoiceDisplay.innerHTML = createChoiceIcon();
      elements.playerChoiceLabel.textContent = "Waiting";
      elements.cpuChoiceLabel.textContent = "Waiting";
      elements.playerSubcopy.textContent = "Ready to engage";
      elements.cpuSubcopy.textContent = "Adaptive opponent";
      return;
    }

    elements.playerChoiceDisplay.innerHTML = createChoiceIcon(round.userChoice);
    elements.cpuChoiceDisplay.innerHTML = createChoiceIcon(round.cpuChoice);
    elements.playerChoiceLabel.textContent = round.userChoiceLabel;
    elements.cpuChoiceLabel.textContent = round.cpuChoiceLabel;
    elements.playerSubcopy.textContent = CHOICES[round.userChoice].tagline;
    elements.cpuSubcopy.textContent = CHOICES[round.cpuChoice].tagline;
  };

  const updateOutcomeMessaging = (round = null) => {
    const outcome = round?.outcome ?? "idle";
    const meta = OUTCOME_META[outcome];
    const difficultyCopy = DIFFICULTY_META[engine.difficulty].copy;

    elements.gameStatus.textContent = meta.status;
    elements.helperText.textContent = round
      ? `${round.statement} ${meta.helper}`
      : difficultyCopy;
    elements.streakLabel.textContent = getStreakMessage(round?.streak ?? 0);

    applyOutcomeClass(elements.gameStatus, outcome);
  };

  const setChoiceState = (button, outcome) => {
    choiceButtons.forEach((item) =>
      item.classList.remove("is-selected", "is-processing", ...OUTCOME_CLASSES),
    );

    if (!button) {
      return;
    }

    button.classList.add("is-selected");
    button.classList.add(`is-${outcome}`);
  };

  const clearProcessingState = () => {
    choiceButtons.forEach((item) => item.classList.remove("is-processing"));
    elements.playerCard.classList.remove("is-processing");
    elements.cpuCard.classList.remove("is-processing");
    elements.vsBadge.classList.remove("is-processing");
    elements.gameStatus.classList.remove("is-processing");
  };

  const showThinkingState = (choice, button) => {
    const choiceMeta = CHOICES[choice];

    choiceButtons.forEach((item) => item.classList.remove("is-processing", ...OUTCOME_CLASSES));

    if (button) {
      button.classList.add("is-selected", "is-processing");
    }

    elements.playerChoiceDisplay.innerHTML = createChoiceIcon(choice);
    elements.playerChoiceLabel.textContent = choiceMeta.label;
    elements.playerSubcopy.textContent = `${choiceMeta.tagline} locked in`;
    elements.cpuChoiceDisplay.innerHTML = createChoiceIcon();
    elements.cpuChoiceLabel.textContent = "Analyzing";
    elements.cpuSubcopy.textContent = "Reading your pattern";
    elements.gameStatus.textContent = "Scanning";
    elements.helperText.textContent = "Computer is reacting. Hold for the reveal sequence.";
    elements.streakLabel.textContent = "Arena cameras locked. Result incoming.";

    removeOutcomeClasses(elements.gameStatus);
    elements.playerCard.classList.add("is-processing");
    elements.cpuCard.classList.add("is-processing");
    elements.vsBadge.classList.add("is-processing");
    elements.gameStatus.classList.add("is-processing");
  };

  const renderHistory = (entries) => {
    elements.historyList.innerHTML = entries.length
      ? entries.map(renderHistoryItem).join("")
      : renderEmptyState("Your latest rounds will appear here with outcomes, tactics, and timing.");
  };

  const renderLeaderboard = (entries) => {
    elements.leaderboardList.innerHTML = entries.length
      ? entries.map(renderLeaderboardItem).join("")
      : renderEmptyState("Play a few rounds to populate the local leaderboard with your best runs.", "li");
  };

  const updatePopup = (round) => {
    elements.popupBadge.textContent = OUTCOME_META[round.outcome].label;
    elements.popupTitle.textContent =
      round.outcome === "win"
        ? "Round Won"
        : round.outcome === "lose"
          ? "Round Lost"
          : "Round Drawn";
    elements.popupCopy.textContent = `${round.statement} ${OUTCOME_META[round.outcome].helper}`;
    elements.popupStreak.textContent = `${round.streak}x`;
    elements.popupDifficulty.textContent = round.difficultyLabel;
    elements.popupRounds.textContent = String(round.rounds);
    applyOutcomeClass(elements.popupBadge, round.outcome);
  };

  const openOverlay = (round) => {
    updatePopup(round);
    elements.resultOverlay.hidden = false;
    overlayOpen = true;

    window.requestAnimationFrame(() => {
      elements.resultOverlay.classList.add("is-open");
      document.body.classList.add("overlay-open");
    });
  };

  const closeOverlay = ({ immediate = false } = {}) => {
    overlayOpen = false;
    elements.resultOverlay.classList.remove("is-open");
    document.body.classList.remove("overlay-open");

    if (immediate) {
      elements.resultOverlay.hidden = true;
      return;
    }

    window.setTimeout(() => {
      if (!overlayOpen) {
        elements.resultOverlay.hidden = true;
      }
    }, 240);
  };

  const refreshDashboard = (snapshot, round = null) => {
    updateCounters(snapshot);
    updateDifficultyButtons(snapshot.difficulty);
    updateCombatants(round);
    updateOutcomeMessaging(round);
  };

  const updateLeaderboardSession = () => {
    const summary = engine.getSummary();

    if (summary.rounds <= 0) {
      renderLeaderboard(storage.loadLeaderboard());
      return;
    }

    const leaderboard = storage.upsertLeaderboardEntry({
      id: sessionId,
      ...summary,
      difficultyLabel: DIFFICULTY_META[summary.difficulty].label,
    });

    renderLeaderboard(leaderboard);
  };

  const pushHistory = (round) => {
    const history = storage.appendHistory({
      id: round.id,
      round: round.round,
      timestamp: round.timestamp,
      outcome: round.outcome,
      difficultyLabel: round.difficultyLabel,
      userChoice: round.userChoiceLabel,
      cpuChoice: round.cpuChoiceLabel,
      statement: round.statement,
    });

    renderHistory(history);
  };

  const setTheme = (theme, { persist = true, notify = false } = {}) => {
    preferences.theme = theme;
    updateThemeButtons(theme);

    if (persist) {
      persistPreferences();
    }

    if (notify) {
      effects.showToast(elements.toast, `${capitalize(theme)} neon theme activated.`);
    }
  };

  const setDifficulty = (difficulty, { persist = true, notify = false } = {}) => {
    engine.setDifficulty(difficulty);
    updateDifficultyButtons(difficulty);
    elements.helperText.textContent = DIFFICULTY_META[difficulty].copy;
    preferences.difficulty = difficulty;

    if (persist) {
      persistPreferences();
    }

    if (notify) {
      effects.showToast(elements.toast, `${DIFFICULTY_META[difficulty].label} AI selected.`);
    }
  };

  const toggleTheme = () => {
    const nextTheme = preferences.theme === "dark" ? "light" : "dark";
    setTheme(nextTheme, { persist: true, notify: true });
  };

  const resetSession = () => {
    roundSequence += 1;
    roundLocked = false;
    engine.resetSession();
    sessionId = createSessionId();
    closeOverlay({ immediate: true });
    clearProcessingState();
    renderHistory(storage.clearHistory());
    setChoiceState(null, "idle");
    refreshDashboard(engine.getSnapshot());
    effects.showToast(elements.toast, "Arena reset. New session started.");
  };

  const resolveChoiceButton = (choice) =>
    choiceButtons.find((button) => button.dataset.choice === choice);

  const handleChoice = async (choice, button, event) => {
    if (roundLocked || overlayOpen || !button) {
      return;
    }

    const suspenseDelay = reduceMotion ? 220 : 1150;
    const resultDelay = reduceMotion ? 80 : 750;
    const roundToken = ++roundSequence;

    roundLocked = true;
    effects.createRipple(event, button);

    showThinkingState(choice, button);
    await wait(suspenseDelay);

    if (roundToken !== roundSequence) {
      return;
    }

    const round = engine.playRound(choice);
    clearProcessingState();
    refreshDashboard(round, round);
    pushHistory(round);
    updateLeaderboardSession();
    setChoiceState(button, round.outcome);

    effects.animateRound({
      arena: elements.versusStage,
      playerCard: elements.playerCard,
      cpuCard: elements.cpuCard,
      vsBadge: elements.vsBadge,
      selectedButton: button,
      outcome: round.outcome,
    });

    if (round.outcome === "win") {
      effects.burstFromElement(button, "win");
      effects.burstFromElement(elements.vsBadge, "win");
    } else if (round.outcome === "lose") {
      effects.burstFromElement(elements.cpuCard, "lose");
    } else {
      effects.burstFromElement(elements.vsBadge, "draw");
      effects.pulse(button);
    }

    await wait(resultDelay);

    if (roundToken !== roundSequence) {
      return;
    }

    openOverlay(round);
    roundLocked = false;
  };

  const bindInteractions = () => {
    effects.attachChoiceInteractions(choiceButtons);

    choiceButtons.forEach((button) => {
      button.addEventListener("click", (event) => {
        handleChoice(button.dataset.choice, button, event);
      });
    });

    difficultyButtons.forEach((button) => {
      button.addEventListener("click", (event) => {
        effects.createRipple(event, button);

        if (roundLocked) {
          effects.showToast(elements.toast, "Finish the current reveal before switching difficulty.");
          return;
        }

        setDifficulty(button.dataset.difficulty, { persist: true, notify: true });
      });
    });

    themeButtons.forEach((button) => {
      button.addEventListener("click", (event) => {
        effects.createRipple(event, button);
        setTheme(button.dataset.themeTarget, { persist: true, notify: true });
      });
    });

    elements.resetSession.addEventListener("click", (event) => {
      effects.createRipple(event, elements.resetSession);
      resetSession();
    });

    elements.clearHistory.addEventListener("click", (event) => {
      effects.createRipple(event, elements.clearHistory);
      renderHistory(storage.clearHistory());
      effects.showToast(elements.toast, "Game history cleared.");
    });

    elements.popupClose.addEventListener("click", (event) => {
      effects.createRipple(event, elements.popupClose);
      closeOverlay();
    });

    elements.nextRound.addEventListener("click", (event) => {
      effects.createRipple(event, elements.nextRound);
      closeOverlay();
    });

    elements.resultOverlay.addEventListener("click", (event) => {
      if (event.target === elements.resultOverlay || event.target === elements.overlayBackdrop) {
        closeOverlay();
      }
    });

    document.addEventListener("keydown", (event) => {
      const key = event.key.toLowerCase();
      const activeElement = document.activeElement;
      const typingTarget =
        activeElement &&
        (activeElement.tagName === "INPUT" ||
          activeElement.tagName === "TEXTAREA" ||
          activeElement.tagName === "SELECT" ||
          activeElement.isContentEditable);

      if (typingTarget || event.repeat) {
        return;
      }

      if (overlayOpen && (key === "escape" || key === "enter" || key === " ")) {
        event.preventDefault();
        closeOverlay();
        return;
      }

      if (key === "r" || key === "p" || key === "s") {
        event.preventDefault();
        const choice = key === "r" ? "rock" : key === "p" ? "paper" : "scissors";
        const button = resolveChoiceButton(choice);
        handleChoice(choice, button, event);
        return;
      }

      if (key === "t") {
        event.preventDefault();
        toggleTheme();
        return;
      }
    });

    window.addEventListener("pagehide", () => {
      updateLeaderboardSession();
      effects.stop();
    });
  };

  const hydrateInitialState = () => {
    renderChoiceIcons();
    updateThemeButtons(preferences.theme);
    setDifficulty(preferences.difficulty, { persist: false, notify: false });
    renderHistory(storage.loadHistory());
    renderLeaderboard(storage.loadLeaderboard());
    refreshDashboard(engine.getSnapshot());
  };

  const startExperience = () => {
    effects.start();
    bindInteractions();
    hydrateInitialState();

    window.setTimeout(() => {
      elements.loadingScreen.classList.add("is-hidden");
      elements.appShell.classList.add("is-ready");
    }, reduceMotion ? 220 : 1350);
  };

  startExperience();
};

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
}
