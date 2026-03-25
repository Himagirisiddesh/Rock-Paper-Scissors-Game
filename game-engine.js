export const CHOICES = Object.freeze({
  rock: Object.freeze({
    id: "rock",
    key: "R",
    label: "Rock",
    tagline: "Heavy impact defense",
  }),
  paper: Object.freeze({
    id: "paper",
    key: "P",
    label: "Paper",
    tagline: "Tactical wrap attack",
  }),
  scissors: Object.freeze({
    id: "scissors",
    key: "S",
    label: "Scissors",
    tagline: "Precision slicing burst",
  }),
});

export const DIFFICULTY_META = Object.freeze({
  easy: Object.freeze({
    label: "Easy",
    copy: "Relaxed random AI for casual rounds.",
  }),
  medium: Object.freeze({
    label: "Medium",
    copy: "Balanced AI with lightweight pattern reading.",
  }),
  hard: Object.freeze({
    label: "Hard",
    copy: "Adaptive AI that actively predicts your rhythm.",
  }),
});

export const OUTCOME_META = Object.freeze({
  idle: Object.freeze({
    label: "Ready",
    status: "Ready",
    helper: "The arena is waiting for your first move.",
  }),
  win: Object.freeze({
    label: "Victory",
    status: "Dominating",
    helper: "Momentum is on your side. Keep the streak alive.",
  }),
  lose: Object.freeze({
    label: "Defeat",
    status: "Recalibrate",
    helper: "The CPU adjusted well. Change your pattern and retaliate.",
  }),
  draw: Object.freeze({
    label: "Draw",
    status: "Deadlock",
    helper: "Evenly matched. A small adjustment breaks the tie.",
  }),
});

const BEATS = Object.freeze({
  rock: "scissors",
  paper: "rock",
  scissors: "paper",
});

const COUNTERS = Object.freeze({
  rock: "paper",
  paper: "scissors",
  scissors: "rock",
});

const CLASH_LINES = Object.freeze({
  "rock:scissors": "Rock crushes Scissors.",
  "paper:rock": "Paper wraps Rock.",
  "scissors:paper": "Scissors slice Paper.",
});

const CYCLE_HINTS = Object.freeze({
  "rock,paper": "scissors",
  "paper,scissors": "rock",
  "scissors,rock": "paper",
});

const choiceKeys = Object.keys(CHOICES);

const clampHistory = (items, limit) => items.slice(-limit);

const randomChoice = () => choiceKeys[Math.floor(Math.random() * choiceKeys.length)];

const pickWeightedChoice = (weights) => {
  const entries = Object.entries(weights);
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let threshold = Math.random() * total;

  for (const [choice, weight] of entries) {
    threshold -= weight;
    if (threshold <= 0) {
      return choice;
    }
  }

  return entries[entries.length - 1][0];
};

const describeClash = (winner, loser, outcome) => {
  if (outcome === "draw") {
    return `${CHOICES[winner].label} mirrors ${CHOICES[loser].label}. Neither side breaks formation.`;
  }

  return CLASH_LINES[`${winner}:${loser}`] ?? `${CHOICES[winner].label} beats ${CHOICES[loser].label}.`;
};

const resolveOutcome = (userChoice, cpuChoice) => {
  if (userChoice === cpuChoice) {
    return "draw";
  }

  return BEATS[userChoice] === cpuChoice ? "win" : "lose";
};

const createRecordId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `round-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
};

export class GameEngine {
  constructor({ difficulty = "medium" } = {}) {
    this.difficulty = difficulty;
    this.playerPattern = [];
    this.state = this.#createBaseState();
  }

  setDifficulty(level) {
    if (DIFFICULTY_META[level]) {
      this.difficulty = level;
    }

    return this.difficulty;
  }

  resetSession() {
    this.playerPattern = [];
    this.state = this.#createBaseState();
    return this.getSnapshot();
  }

  getSnapshot() {
    return {
      ...this.state,
      difficulty: this.difficulty,
    };
  }

  getSummary() {
    const { userScore, cpuScore, draws, rounds, streak, bestStreak, lastOutcome } = this.state;

    return {
      userScore,
      cpuScore,
      draws,
      rounds,
      streak,
      bestStreak,
      difficulty: this.difficulty,
      lastOutcome,
    };
  }

  playRound(userChoice) {
    if (!CHOICES[userChoice]) {
      throw new Error(`Unsupported choice "${userChoice}"`);
    }

    const cpuChoice = this.#chooseCpuChoice();
    const outcome = resolveOutcome(userChoice, cpuChoice);

    this.playerPattern = clampHistory([...this.playerPattern, userChoice], 12);
    this.state.rounds += 1;
    this.state.lastOutcome = outcome;

    if (outcome === "win") {
      this.state.userScore += 1;
      this.state.streak += 1;
      this.state.bestStreak = Math.max(this.state.bestStreak, this.state.streak);
    } else if (outcome === "lose") {
      this.state.cpuScore += 1;
      this.state.streak = 0;
    } else {
      this.state.draws += 1;
      this.state.streak = 0;
    }

    const winner = outcome === "lose" ? cpuChoice : userChoice;
    const loser = outcome === "lose" ? userChoice : cpuChoice;
    const statement = describeClash(winner, loser, outcome);
    const record = {
      id: createRecordId(),
      round: this.state.rounds,
      timestamp: new Date().toISOString(),
      outcome,
      difficulty: this.difficulty,
      userChoice,
      cpuChoice,
      userChoiceLabel: CHOICES[userChoice].label,
      cpuChoiceLabel: CHOICES[cpuChoice].label,
      streak: this.state.streak,
      bestStreak: this.state.bestStreak,
      rounds: this.state.rounds,
      userScore: this.state.userScore,
      cpuScore: this.state.cpuScore,
      draws: this.state.draws,
      statement,
    };

    this.state.history = clampHistory([...this.state.history, record], 16);

    return {
      ...record,
      difficultyLabel: DIFFICULTY_META[this.difficulty].label,
      meta: OUTCOME_META[outcome],
      history: [...this.state.history],
    };
  }

  #createBaseState() {
    return {
      userScore: 0,
      cpuScore: 0,
      draws: 0,
      rounds: 0,
      streak: 0,
      bestStreak: 0,
      lastOutcome: "idle",
      history: [],
    };
  }

  #chooseCpuChoice() {
    if (this.difficulty === "easy") {
      return randomChoice();
    }

    const predictedChoice = this.#predictPlayerChoice();
    const counterChoice = COUNTERS[predictedChoice];

    if (this.difficulty === "medium") {
      if (Math.random() < 0.58) {
        return counterChoice;
      }

      return this.#pickFallback(counterChoice, predictedChoice, 2.2, 1.3);
    }

    if (Math.random() < 0.78) {
      return counterChoice;
    }

    return this.#pickFallback(counterChoice, predictedChoice, 3.6, 1.1);
  }

  #pickFallback(counterChoice, predictedChoice, counterWeight, predictedWeight) {
    const weights = {
      rock: 1,
      paper: 1,
      scissors: 1,
    };

    weights[counterChoice] += counterWeight;
    weights[predictedChoice] += predictedWeight;

    return pickWeightedChoice(weights);
  }

  #predictPlayerChoice() {
    const recent = this.playerPattern.slice(-6);

    if (!recent.length) {
      return randomChoice();
    }

    const weights = {
      rock: 1,
      paper: 1,
      scissors: 1,
    };

    recent.forEach((choice, index) => {
      weights[choice] += (index + 1) * 0.85;
    });

    const lastTwo = recent.slice(-2);
    if (lastTwo.length === 2 && lastTwo[0] === lastTwo[1]) {
      weights[lastTwo[0]] += this.difficulty === "hard" ? 4.5 : 2.5;
    }

    const lastThree = recent.slice(-3);
    if (lastThree.length === 3 && lastThree.every((choice) => choice === lastThree[0])) {
      weights[lastThree[0]] += this.difficulty === "hard" ? 5.4 : 3.1;
    }

    const cycleHint = CYCLE_HINTS[lastTwo.join(",")];
    if (cycleHint) {
      weights[cycleHint] += this.difficulty === "hard" ? 3.4 : 1.8;
    }

    return Object.entries(weights).reduce(
      (best, current) => (current[1] > best[1] ? current : best),
      ["rock", 0],
    )[0];
  }
}
