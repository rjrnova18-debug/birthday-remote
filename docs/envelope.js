// Scenes 1–2: the closed envelope and its opening animation.
// Pure presentation: it only adds CSS classes and waits for animations to end.
// The timing of each step lives in style.css (the .is-opening rules).

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

// Resolves when the CSS animation called `name` finishes on `element`.
export function animationEnd(element, name) {
  return new Promise((resolve) => {
    element.addEventListener("animationend", function onEnd(event) {
      if (event.animationName === name) {
        element.removeEventListener("animationend", onEnd);
        resolve();
      }
    });
  });
}

// Seal breaks → flap swings open → the folded letter rises. Resolves at the end.
export async function openEnvelope(sceneElement) {
  sceneElement.classList.add("is-opening");
  await animationEnd(sceneElement.querySelector(".env-letter"), "letter-rise");
}
