// Scene 4: the celebration. Pure presentation: it starts the CSS entrance
// (the .is-playing rules in style.css) and fires the confetti.

const CONFETTI_COLORS = ["#F25F8C", "#FFB547", "#2F9FCB", "#7BBF5A", "#A77BE0", "#FF7A45"];

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shootConfetti(options) {
  // canvas-confetti comes from a CDN; if it is blocked the page still works.
  if (typeof window.confetti !== "function") {
    return;
  }
  window.confetti({
    colors: CONFETTI_COLORS,
    ticks: 260,
    disableForReducedMotion: true,
    ...options,
  });
}

export async function playCelebration(sceneElement) {
  sceneElement.classList.add("is-playing");

  // Two cannons from the sides, then one burst from the middle.
  shootConfetti({ particleCount: 90, angle: 60, spread: 65, startVelocity: 55, origin: { x: 0, y: 0.75 } });
  shootConfetti({ particleCount: 90, angle: 120, spread: 65, startVelocity: 55, origin: { x: 1, y: 0.75 } });
  await wait(450);
  shootConfetti({ particleCount: 120, spread: 110, startVelocity: 40, origin: { x: 0.5, y: 0.35 } });
}
