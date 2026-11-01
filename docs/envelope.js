// Scenes 1–2: the closed envelope and its opening animation.
// Pure presentation: it only adds CSS classes and waits for animations to end.
// The timing of each step lives in style.css (the .is-opening rules).

import { playSound } from "./sounds.js";

const STAR_PATH = "M12 0C13 8 16 11 24 12C16 13 13 16 12 24C11 16 8 13 0 12C8 11 11 8 12 0Z";

// Twinkling stars: position in % of the scene, size in px, delay in s.
const STARS = [
  { x: 12, y: 17, size: 28, delay: 0 },
  { x: 23, y: 72, size: 18, delay: 0.8 },
  { x: 83, y: 14, size: 34, delay: 1.3 },
  { x: 77, y: 80, size: 20, delay: 0.4 },
  { x: 50, y: 6, size: 16, delay: 1.8 },
  { x: 91, y: 50, size: 22, delay: 1 },
  { x: 7, y: 48, size: 24, delay: 2 },
];

export function scatterStars(container) {
  container.innerHTML = STARS.map(
    ({ x, y, size, delay }) =>
      `<svg class="star" viewBox="0 0 24 24" width="${size}" height="${size}"
        style="left: ${x}%; top: ${y}%; animation-delay: ${delay}s"><path d="${STAR_PATH}"/></svg>`,
  ).join("");
}

// Resolves when the CSS animation called `name` fires `type` on `element`
// ("animationstart" after its delay, or "animationend").
function animationEvent(element, type, name) {
  return new Promise((resolve) => {
    element.addEventListener(type, function onEvent(event) {
      if (event.animationName === name) {
        element.removeEventListener(type, onEvent);
        resolve();
      }
    });
  });
}

// Seal breaks → flap swings open → the folded letter rises. Resolves at the end.
// The sounds follow the CSS timing: the letter's sound waits for its animation
// to really start, so changing the delay in style.css keeps them in sync.
export async function openEnvelope(sceneElement) {
  const letter = sceneElement.querySelector(".env-letter");
  const letterStarts = animationEvent(letter, "animationstart", "letter-rise");
  const letterEnds = animationEvent(letter, "animationend", "letter-rise");

  sceneElement.classList.add("is-opening");
  playSound("seal");
  await letterStarts;
  playSound("letter");
  await letterEnds;
}
