const SVG_ICONS = Object.freeze({
  idle: `
    <svg class="choice-svg" viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r="18"></circle>
      <path d="M32 8v10"></path>
      <path d="M32 46v10"></path>
      <path d="M8 32h10"></path>
      <path d="M46 32h10"></path>
      <path d="M17 17l7 7"></path>
      <path d="M40 40l7 7"></path>
      <path d="M17 47l7-7"></path>
      <path d="M40 24l7-7"></path>
    </svg>
  `,
  rock: `
    <svg class="choice-svg" viewBox="0 0 64 64" aria-hidden="true">
      <path d="M18 42 14 31l6-11 12-5 12 4 7 12-3 12-11 7H25l-7-8Z"></path>
      <path d="M27 22 23 31l6 6"></path>
      <path d="M37 23 42 31l-5 7"></path>
      <path d="M30 41h6"></path>
    </svg>
  `,
  paper: `
    <svg class="choice-svg" viewBox="0 0 64 64" aria-hidden="true">
      <path d="M21 12h17l8 8v31a3 3 0 0 1-3 3H21a3 3 0 0 1-3-3V15a3 3 0 0 1 3-3Z"></path>
      <path d="M38 12v11h11"></path>
      <path d="M25 27h14"></path>
      <path d="M25 34h14"></path>
      <path d="M25 41h10"></path>
    </svg>
  `,
  scissors: `
    <svg class="choice-svg" viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="20" cy="44" r="7"></circle>
      <circle cx="20" cy="20" r="7"></circle>
      <path d="M26 24 48 14"></path>
      <path d="M26 40 48 50"></path>
      <path d="M32 32 52 32"></path>
      <path d="M30 30 48 14"></path>
      <path d="M30 34 48 50"></path>
    </svg>
  `,
});

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const randomBetween = (min, max) => min + Math.random() * (max - min);

const pickPalette = (outcome) => {
  if (outcome === "win") {
    return ["#62e7ff", "#79ffad", "#ffdf7b", "#ffffff"];
  }

  if (outcome === "lose") {
    return ["#ff7a92", "#ff73d3", "#ffd66c"];
  }

  return ["#ffd66c", "#62e7ff", "#ffffff"];
};

export const createChoiceIcon = (choice = "idle") => SVG_ICONS[choice] ?? SVG_ICONS.idle;

export class EffectsDirector {
  constructor({ ambientCanvas, fxCanvas, reducedMotion = false } = {}) {
    this.ambientCanvas = ambientCanvas;
    this.fxCanvas = fxCanvas;
    this.ambientContext = ambientCanvas?.getContext("2d") ?? null;
    this.fxContext = fxCanvas?.getContext("2d") ?? null;
    this.reducedMotion = reducedMotion;
    this.pixelRatio = 1;
    this.ambientParticles = [];
    this.fxParticles = [];
    this.frameId = null;
    this.counterAnimations = new WeakMap();
    this.toastTimeout = null;

    this.handleResize = this.handleResize.bind(this);
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    this.loop = this.loop.bind(this);
  }

  start() {
    if (!this.ambientContext || !this.fxContext) {
      return;
    }

    this.handleResize();
    this.seedAmbientParticles();
    window.addEventListener("resize", this.handleResize, { passive: true });
    document.addEventListener("visibilitychange", this.handleVisibilityChange);
    this.loop();
  }

  stop() {
    window.removeEventListener("resize", this.handleResize);
    document.removeEventListener("visibilitychange", this.handleVisibilityChange);

    if (this.frameId) {
      window.cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
  }

  attachChoiceInteractions(choiceButtons) {
    choiceButtons.forEach((button) => {
      if (button.dataset.tiltReady === "true") {
        return;
      }

      button.dataset.tiltReady = "true";

      button.addEventListener("pointermove", (event) => {
        if (this.reducedMotion) {
          return;
        }

        const rect = button.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const rotateY = ((x / rect.width) - 0.5) * 14;
        const rotateX = ((0.5 - y / rect.height) * 14);

        button.style.setProperty("--pointer-x", `${(x / rect.width) * 100}%`);
        button.style.setProperty("--pointer-y", `${(y / rect.height) * 100}%`);
        button.style.setProperty("--rotate-x", `${rotateX.toFixed(2)}deg`);
        button.style.setProperty("--rotate-y", `${rotateY.toFixed(2)}deg`);
      });

      button.addEventListener("pointerleave", () => {
        button.style.setProperty("--pointer-x", "50%");
        button.style.setProperty("--pointer-y", "50%");
        button.style.setProperty("--rotate-x", "0deg");
        button.style.setProperty("--rotate-y", "0deg");
      });
    });
  }

  createRipple(event, target) {
    if (!target) {
      return;
    }

    const rect = target.getBoundingClientRect();
    const pointerX = "clientX" in event ? event.clientX : rect.left + rect.width / 2;
    const pointerY = "clientY" in event ? event.clientY : rect.top + rect.height / 2;
    const ripple = document.createElement("span");

    ripple.className = "ripple";
    ripple.style.left = `${pointerX - rect.left}px`;
    ripple.style.top = `${pointerY - rect.top}px`;
    target.append(ripple);

    ripple.addEventListener("animationend", () => ripple.remove(), { once: true });
  }

  animateCounter(element, from, to, { suffix = "", duration = 650 } = {}) {
    if (!element) {
      return;
    }

    const previousFrame = this.counterAnimations.get(element);
    if (previousFrame) {
      window.cancelAnimationFrame(previousFrame);
    }

    if (from === to || this.reducedMotion) {
      element.textContent = `${to}${suffix}`;
      return;
    }

    const startTime = performance.now();
    const delta = to - from;

    const update = (timestamp) => {
      const progress = clamp((timestamp - startTime) / duration, 0, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = Math.round(from + delta * eased);
      element.textContent = `${value}${suffix}`;

      if (progress < 1) {
        const nextFrame = window.requestAnimationFrame(update);
        this.counterAnimations.set(element, nextFrame);
      }
    };

    const firstFrame = window.requestAnimationFrame(update);
    this.counterAnimations.set(element, firstFrame);
  }

  animateRound({
    arena,
    playerCard,
    cpuCard,
    vsBadge,
    outcomeElement,
    selectedButton,
    outcome,
  }) {
    if (!playerCard || !cpuCard || !vsBadge) {
      return;
    }

    if (this.reducedMotion) {
      if (outcome === "lose") {
        this.shake(arena);
      } else if (outcome === "draw") {
        this.pulse(arena);
      }
      return;
    }

    const shared = {
      duration: 520,
      easing: "cubic-bezier(0.22, 1, 0.36, 1)",
      fill: "both",
    };

    playerCard.animate(
      [
        { opacity: 0.45, transform: "translate3d(-18px, 16px, 0) scale(0.92) rotate(-3deg)" },
        { opacity: 1, transform: "translate3d(0, 0, 0) scale(1) rotate(0deg)" },
      ],
      shared,
    );

    cpuCard.animate(
      [
        { opacity: 0.45, transform: "translate3d(18px, 16px, 0) scale(0.92) rotate(3deg)" },
        { opacity: 1, transform: "translate3d(0, 0, 0) scale(1) rotate(0deg)" },
      ],
      shared,
    );

    vsBadge.animate(
      [
        { transform: "scale(0.65) rotate(-18deg)", opacity: 0.45, filter: "blur(10px)" },
        { transform: "scale(1.08) rotate(6deg)", opacity: 1, filter: "blur(0px)", offset: 0.6 },
        { transform: "scale(1) rotate(0deg)", opacity: 1, filter: "blur(0px)" },
      ],
      {
        duration: 620,
        easing: "cubic-bezier(0.18, 1.18, 0.2, 1)",
        fill: "both",
      },
    );

    if (outcomeElement) {
      outcomeElement.animate(
        [
          { opacity: 0.2, transform: "translateY(12px)" },
          { opacity: 1, transform: "translateY(0)" },
        ],
        {
          duration: 450,
          easing: "ease-out",
          fill: "both",
        },
      );
    }

    if (selectedButton) {
      selectedButton.animate(
        [
          {
            transform:
              "perspective(1200px) rotateX(var(--rotate-x)) rotateY(var(--rotate-y)) scale(1)",
          },
          {
            transform:
              "perspective(1200px) rotateX(var(--rotate-x)) rotateY(var(--rotate-y)) scale(1.06)",
          },
          {
            transform:
              "perspective(1200px) rotateX(var(--rotate-x)) rotateY(var(--rotate-y)) scale(1.02)",
          },
        ],
        {
          duration: 460,
          easing: "cubic-bezier(0.2, 1.2, 0.2, 1)",
        },
      );
    }

    if (outcome === "lose") {
      this.shake(arena);
    } else if (outcome === "draw") {
      this.pulse(arena);
    }
  }

  shake(element) {
    if (!element) {
      return;
    }

    element.classList.remove("is-shaking");
    void element.offsetWidth;
    element.classList.add("is-shaking");
    window.setTimeout(() => element.classList.remove("is-shaking"), 560);
  }

  pulse(element) {
    if (!element) {
      return;
    }

    element.classList.remove("is-glowing");
    void element.offsetWidth;
    element.classList.add("is-glowing");
    window.setTimeout(() => element.classList.remove("is-glowing"), 1200);
  }

  burstFromElement(element, outcome = "win") {
    if (!element || !this.fxContext) {
      return;
    }

    const rect = element.getBoundingClientRect();
    this.burst({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      outcome,
    });
  }

  burst({ x, y, outcome = "win" }) {
    const palette = pickPalette(outcome);
    const sparkCount = outcome === "win" ? 42 : outcome === "lose" ? 26 : 20;

    for (let index = 0; index < sparkCount; index += 1) {
      const angle = randomBetween(0, Math.PI * 2);
      const speed = randomBetween(1.2, outcome === "win" ? 4.3 : 3.1);

      this.fxParticles.push({
        kind: "spark",
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: randomBetween(2.2, 4.8),
        color: palette[index % palette.length],
        life: 0,
        maxLife: randomBetween(28, 54),
        gravity: 0.04,
        drag: 0.985,
      });
    }

    if (outcome === "win") {
      this.confetti({ x, y, palette });
    }
  }

  confetti({ x, y, palette = pickPalette("win") }) {
    const confettiCount = this.reducedMotion ? 16 : 64;

    for (let index = 0; index < confettiCount; index += 1) {
      this.fxParticles.push({
        kind: "confetti",
        x: x + randomBetween(-18, 18),
        y: y + randomBetween(-18, 18),
        vx: randomBetween(-2.8, 2.8),
        vy: randomBetween(-6.5, -2.4),
        size: randomBetween(4, 8),
        rotation: randomBetween(0, Math.PI * 2),
        rotationSpeed: randomBetween(-0.3, 0.3),
        color: palette[index % palette.length],
        life: 0,
        maxLife: randomBetween(72, 116),
        gravity: 0.08,
        drag: 0.992,
      });
    }
  }

  showToast(element, message) {
    if (!element) {
      return;
    }

    element.textContent = message;
    element.classList.add("is-visible");

    if (this.toastTimeout) {
      window.clearTimeout(this.toastTimeout);
    }

    this.toastTimeout = window.setTimeout(() => {
      element.classList.remove("is-visible");
    }, 1900);
  }

  handleResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    [this.ambientCanvas, this.fxCanvas].forEach((canvas) => {
      if (!canvas) {
        return;
      }

      canvas.width = width * this.pixelRatio;
      canvas.height = height * this.pixelRatio;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    });

    this.ambientContext?.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
    this.fxContext?.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
    this.seedAmbientParticles();
  }

  handleVisibilityChange() {
    if (document.hidden) {
      if (this.frameId) {
        window.cancelAnimationFrame(this.frameId);
        this.frameId = null;
      }
      return;
    }

    if (!this.frameId) {
      this.loop();
    }
  }

  seedAmbientParticles() {
    if (!this.ambientCanvas) {
      return;
    }

    const width = this.ambientCanvas.width / this.pixelRatio;
    const height = this.ambientCanvas.height / this.pixelRatio;
    const particleCount = this.reducedMotion
      ? 14
      : clamp(Math.floor(width / 34), 18, 44);

    this.ambientParticles = Array.from({ length: particleCount }, () => ({
      x: randomBetween(0, width),
      y: randomBetween(0, height),
      vx: randomBetween(-0.16, 0.16),
      vy: randomBetween(-0.14, 0.14),
      radius: randomBetween(1.3, 3.1),
      hue: randomBetween(180, 330),
      alpha: randomBetween(0.18, 0.55),
    }));
  }

  loop() {
    this.drawAmbient();
    this.drawFx();
    this.frameId = window.requestAnimationFrame(this.loop);
  }

  drawAmbient() {
    if (!this.ambientContext || !this.ambientCanvas) {
      return;
    }

    const width = this.ambientCanvas.width / this.pixelRatio;
    const height = this.ambientCanvas.height / this.pixelRatio;
    const ctx = this.ambientContext;

    ctx.clearRect(0, 0, width, height);

    this.ambientParticles.forEach((particle) => {
      particle.x += particle.vx;
      particle.y += particle.vy;

      if (particle.x < -20) particle.x = width + 20;
      if (particle.x > width + 20) particle.x = -20;
      if (particle.y < -20) particle.y = height + 20;
      if (particle.y > height + 20) particle.y = -20;
    });

    for (let index = 0; index < this.ambientParticles.length; index += 1) {
      const particle = this.ambientParticles[index];

      ctx.beginPath();
      ctx.fillStyle = `hsla(${particle.hue}, 100%, 70%, ${particle.alpha})`;
      ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      ctx.fill();

      for (let inner = index + 1; inner < this.ambientParticles.length; inner += 1) {
        const peer = this.ambientParticles[inner];
        const dx = particle.x - peer.x;
        const dy = particle.y - peer.y;
        const distance = Math.hypot(dx, dy);

        if (distance > 130) {
          continue;
        }

        ctx.beginPath();
        ctx.strokeStyle = `rgba(98, 231, 255, ${0.1 - distance / 1600})`;
        ctx.lineWidth = 1;
        ctx.moveTo(particle.x, particle.y);
        ctx.lineTo(peer.x, peer.y);
        ctx.stroke();
      }
    }
  }

  drawFx() {
    if (!this.fxContext || !this.fxCanvas) {
      return;
    }

    const width = this.fxCanvas.width / this.pixelRatio;
    const height = this.fxCanvas.height / this.pixelRatio;
    const ctx = this.fxContext;

    ctx.clearRect(0, 0, width, height);

    this.fxParticles = this.fxParticles.filter((particle) => {
      particle.life += 1;
      particle.vx *= particle.drag;
      particle.vy = particle.vy * particle.drag + particle.gravity;
      particle.x += particle.vx;
      particle.y += particle.vy;

      const alpha = 1 - particle.life / particle.maxLife;

      if (alpha <= 0) {
        return false;
      }

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = particle.color;
      ctx.strokeStyle = particle.color;

      if (particle.kind === "confetti") {
        particle.rotation += particle.rotationSpeed;
        ctx.translate(particle.x, particle.y);
        ctx.rotate(particle.rotation);
        ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size * 0.7);
      } else {
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
      return particle.x > -40 && particle.x < width + 40 && particle.y < height + 80;
    });
  }
}
