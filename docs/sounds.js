// Sound effects. Uses the Web Audio API instead of <audio> tags: once the
// AudioContext is unlocked by a tap, any sound can play later from a timer or
// an animation (an <audio> tag on iPhone would need its own tap every time).
// If a file fails to load, that sound is simply skipped.

// start: seconds of silence at the beginning of the file to skip, so the
// sound lands on the animation. length (optional): seconds to play from there.
// volume: balances the files against each other.
const SOUNDS = {
  seal: { src: "sfx/plastic-crunch.mp3", start: 0.15, volume: 1 },
  letter: { src: "sfx/paper-handling-sfx.mp3", start: 0.15, volume: 0.5 },
  unfold: { src: "sfx/rustling-paper.mp3", start: 0.12, volume: 0.5 },
  party: { src: "sfx/birthday-party-horn.mp3", start: 0.13, volume: 0.9 },
  // The file has several "oiia-oiia"; only the first one is used.
  cat: { src: "sfx/oiia-cat.mp3", start: 1.5, length: 1.6, volume: 0.7 },
};

const AudioContextClass = window.AudioContext || window.webkitAudioContext;
const context = AudioContextClass ? new AudioContextClass() : null;
const buffers = {};

// Download and decode every file right away, while the envelope is waiting.
export function loadSounds() {
  if (!context) {
    return;
  }
  // On iPhone, Web Audio is silent when the ring switch is off unless the
  // page says it plays media (Safari 16.4+).
  if (navigator.audioSession) {
    navigator.audioSession.type = "playback";
  }
  for (const [name, { src }] of Object.entries(SOUNDS)) {
    fetch(src)
      .then((response) => response.arrayBuffer())
      .then((data) => context.decodeAudioData(data))
      .then((buffer) => {
        buffers[name] = buffer;
      })
      .catch(() => console.warn(`Sound "${name}" could not be loaded.`));
  }
}

// Browsers keep audio muted until the visitor interacts with the page.
// Must be called inside a click handler (the tap on the envelope).
export function unlockSounds() {
  context?.resume();
}

// Plays a sound now, or `delaySeconds` from now. The audio clock schedules it
// precisely, without a setTimeout. Returns a function that cancels it.
export function playSound(name, delaySeconds = 0) {
  const buffer = buffers[name];
  if (!context || !buffer) {
    return () => {};
  }
  const { start, length, volume } = SOUNDS[name];
  const source = context.createBufferSource();
  const gain = context.createGain();
  source.buffer = buffer;
  gain.gain.value = volume;
  source.connect(gain).connect(context.destination);
  source.start(context.currentTime + delaySeconds, start, length);
  return () => source.stop();
}
