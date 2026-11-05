// The spinning cat next to the card: its "oiia-oiia" plays on the first spins.
// A GIF gives no event when a frame changes, so the sound follows the clock:
// the GIF is restarted from frame 0 and the spins are scheduled from its timing.

import { playSound } from "./sounds.js";

// Read from the GIF's frames: the cat sits still for 1.69 s, then spins,
// and the whole loop lasts 3.48 s.
const SPIN_STARTS_AT = 1.69;
const LOOP_SECONDS = 3.48;
const SPINS_WITH_SOUND = 2; // After these, the cat keeps spinning in silence.

let gifBlob = null;
let cancelSounds = [];
let run = 0; // Changes on every start/stop, so a late start can tell it is stale.

// Keeps a copy of the GIF in memory, to restart it without downloading it again.
export async function loadCat(url) {
  try {
    gifBlob = await (await fetch(url)).blob();
  } catch {
    console.warn("Cat GIF could not be loaded: it will spin without sound.");
  }
}

export async function startCat(image) {
  stopCat();
  if (!gifBlob) {
    return;
  }
  const thisRun = run;

  // A new blob: URL is a new image for the browser, so the GIF starts over.
  const previous = image.src;
  image.src = URL.createObjectURL(gifBlob);
  if (previous.startsWith("blob:")) {
    URL.revokeObjectURL(previous);
  }
  await image.decode().catch(() => {});
  if (thisRun !== run) {
    return; // The card was closed while the image was decoding.
  }

  for (let spin = 0; spin < SPINS_WITH_SOUND; spin += 1) {
    cancelSounds.push(playSound("cat", SPIN_STARTS_AT + spin * LOOP_SECONDS));
  }
}

export function stopCat() {
  run += 1;
  for (const cancel of cancelSounds) {
    cancel();
  }
  cancelSounds = [];
}
