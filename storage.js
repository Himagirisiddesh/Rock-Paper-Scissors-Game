const STORAGE_KEYS = Object.freeze({
  prefs: "rps-neon:prefs",
  history: "rps-neon:history",
  leaderboard: "rps-neon:leaderboard",
});

const DEFAULT_PREFS = Object.freeze({
  theme: "dark",
  difficulty: "medium",
  soundEnabled: true,
});

const createMemoryStorage = () => {
  const memory = new Map();

  return {
    getItem(key) {
      return memory.has(key) ? memory.get(key) : null;
    },
    setItem(key, value) {
      memory.set(key, value);
    },
    removeItem(key) {
      memory.delete(key);
    },
  };
};

const safeParse = (value, fallback) => {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const sortLeaderboard = (entries) =>
  [...entries]
    .sort((left, right) => {
      if (right.userScore !== left.userScore) {
        return right.userScore - left.userScore;
      }

      if (right.bestStreak !== left.bestStreak) {
        return right.bestStreak - left.bestStreak;
      }

      return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    })
    .slice(0, 5);

export class StorageController {
  constructor() {
    this.storage = this.#resolveStorage();
  }

  loadPrefs() {
    return {
      ...DEFAULT_PREFS,
      ...safeParse(this.storage.getItem(STORAGE_KEYS.prefs), {}),
    };
  }

  savePrefs(nextPrefs) {
    const merged = {
      ...DEFAULT_PREFS,
      ...nextPrefs,
    };

    this.storage.setItem(STORAGE_KEYS.prefs, JSON.stringify(merged));
    return merged;
  }

  loadHistory() {
    return safeParse(this.storage.getItem(STORAGE_KEYS.history), []);
  }

  appendHistory(entry) {
    const history = [entry, ...this.loadHistory()].slice(0, 12);
    this.storage.setItem(STORAGE_KEYS.history, JSON.stringify(history));
    return history;
  }

  clearHistory() {
    this.storage.setItem(STORAGE_KEYS.history, JSON.stringify([]));
    return [];
  }

  loadLeaderboard() {
    return sortLeaderboard(safeParse(this.storage.getItem(STORAGE_KEYS.leaderboard), []));
  }

  upsertLeaderboardEntry(session) {
    const leaderboard = this.loadLeaderboard();
    const index = leaderboard.findIndex((entry) => entry.id === session.id);
    const payload = {
      ...session,
      updatedAt: new Date().toISOString(),
    };

    if (index >= 0) {
      leaderboard[index] = payload;
    } else {
      leaderboard.push(payload);
    }

    const sorted = sortLeaderboard(leaderboard);
    this.storage.setItem(STORAGE_KEYS.leaderboard, JSON.stringify(sorted));
    return sorted;
  }

  #resolveStorage() {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        return window.localStorage;
      }
    } catch {
      return createMemoryStorage();
    }

    return createMemoryStorage();
  }
}
