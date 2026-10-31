// Scene 3: the folded letter leaves the envelope, unfolds in 3D and grows
// until its paper becomes the background of the celebration.
// Uses the Web Animations API: every step returns a promise, so the timeline
// below reads top to bottom like a script.

function play(element, keyframes, options) {
  return element.animate(keyframes, { fill: "forwards", easing: "ease-in-out", ...options }).finished;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function center(rect) {
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

export async function unfoldLetter(scene) {
  const stage = scene.querySelector(".letter-stage");
  const mover = stage.querySelector(".sheet-mover");
  const sheet = stage.querySelector(".sheet");
  const sticker = stage.querySelector(".sheet-sticker");
  const envelope = scene.querySelector(".envelope-button");
  const envelopeLetter = scene.querySelector(".env-letter");

  stage.hidden = false;

  // 1. Hand-off: the 3D letter starts exactly where the envelope's letter is,
  //    then travels to the centre while the envelope fades away.
  const from = envelopeLetter.getBoundingClientRect();
  const to = stage.querySelector(".panel--tl").getBoundingClientRect();
  const dx = center(from).x - center(to).x;
  const dy = center(from).y - center(to).y;
  const scale = from.width / to.width;
  envelopeLetter.style.visibility = "hidden";

  await Promise.all([
    play(mover, [
      { transform: `translate(${dx}px, ${dy}px) scale(${scale}) rotate(-3deg)` },
      { transform: "none" },
    ], { duration: 700 }),
    play(envelope, [
      { opacity: 1, transform: "none" },
      { opacity: 0, transform: "translateY(40px) scale(0.9)" },
    ], { duration: 500, easing: "ease-in" }),
  ]);

  // 2. The right half opens; the sheet slides so it stays centred.
  play(sticker, [{ opacity: 1 }, { opacity: 0, transform: "scale(0.6)" }], { duration: 200 });
  await Promise.all([
    play(stage.querySelector(".panel--tr"), [{ transform: "rotateY(-179deg)" }, { transform: "rotateY(0deg)" }], { duration: 600 }),
    play(stage.querySelector(".panel--br"), [{ transform: "rotateY(179deg)" }, { transform: "rotateY(0deg)" }], { duration: 600 }),
    play(sheet, [{ transform: "translate(25%, 25%)" }, { transform: "translate(0, 25%)" }], { duration: 600 }),
  ]);

  // 3. The bottom half opens: the full sheet, with the cross-shaped creases.
  await Promise.all([
    play(stage.querySelector(".sheet-half--bottom"), [{ transform: "rotateX(178deg)" }, { transform: "rotateX(0deg)" }], { duration: 600 }),
    play(sheet, [{ transform: "translate(0, 25%)" }, { transform: "translate(0, 0)" }], { duration: 600 }),
  ]);

  // 4. A breath, then the sheet grows past the screen edges. The creases fade
  //    under a plain paper layer, so what is left is a smooth background.
  await wait(200);
  const sheetRect = sheet.getBoundingClientRect();
  const cover = 1.15 * Math.max(window.innerWidth / sheetRect.width, window.innerHeight / sheetRect.height);
  await Promise.all([
    play(mover, [{ transform: "scale(1)" }, { transform: `scale(${cover})` }], { duration: 800 }),
    play(stage.querySelector(".sheet-flat"), [{ opacity: 0 }, { opacity: 1 }], { duration: 500, delay: 150 }),
  ]);
}
