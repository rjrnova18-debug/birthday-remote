// Birthday Remote page: decides which scene is visible and draws it from
// what device.js reports. It knows nothing about MQTT.
// The secret topic key and the friend's name come from the link
// (?t=your-secret&n=Name), so neither ends up in the public repository.

import { connectDevice } from "./device.js";
import { openEnvelope, scatterStars } from "./envelope.js";
import { unfoldLetter } from "./unfold.js";
import { playCelebration } from "./celebration.js";

// Everything you may want to tweak lives here. Nothing secret.
const CONFIG = {
  brokerUrl: "wss://broker.hivemq.com:8884/mqtt",
  defaultName: "amigo",
  countdownSeconds: 5,
  confirmTimeoutMs: 5000, // How long to wait for the ESP32 to confirm the ON.
  gifs: {
    dance: "https://media.tenor.com/ezk10TtQiCUAAAAj/club-penguin-club-penguin-dance.gif",
    birthday: "https://media.tenor.com/38aGDkTKEloAAAAj/birthday-happy-birthday.gif",
    sticker: "https://media.tenor.com/sbfBfp3FeY8AAAAj/oia-uia.gif",
    success: "https://media1.tenor.com/m/g16jQZqbvWoAAAAC/yippee-happy.gif",
  },
  letterPauseMs: 600, // Pause with the letter out of the envelope before scene 3.
  cardDelayMs: 8000, // Time to enjoy the celebration before the card pops up.
};

// Two scenes: "envelope" covers storyboard scenes 1–3 (the envelope opens and
// the letter unfolds in place) and "celebration" covers 4–5 (the countdown
// card pops up over it).

// Length of the countdown ring's circle (2 * PI * radius 96), used to empty it.
const RING_LENGTH = 2 * Math.PI * 96;

const params = new URLSearchParams(window.location.search);
const topicKey = params.get("t");
const friendName = params.get("n") || CONFIG.defaultName;
// ?s=celebration or ?s=card skips the intro: handy while developing.
const devStart = params.get("s");

const envelopeScene = document.querySelector('[data-scene="envelope"]');
const celebrationScene = document.querySelector('[data-scene="celebration"]');
const cardOverlay = document.querySelector(".card-overlay");
const closeCardButton = document.getElementById("card-close");
const reopenCardButton = document.getElementById("card-reopen");
const envelopeButton = document.getElementById("envelope-button");
const activateButton = document.getElementById("activate-button");
const cancelButton = document.getElementById("cancel-button");
const repeatButton = document.getElementById("repeat-button");
const retryButton = document.getElementById("retry-button");
const countNumber = document.getElementById("count-number");
const ringProgress = document.getElementById("ring-progress");

// What the page knows.
let scene = "envelope"; // envelope | celebration
let cardReady = false; // Has the card popped up at least once?
let cardShown = false; // Is it open right now? The friend can close and reopen it.
let cardState = "idle"; // idle | counting | waiting | done | error
let count = CONFIG.countdownSeconds;
let deviceState = { brokerConnected: false, deviceOnline: false, ledIsOn: false };
let device = null; // Commands for the ESP32; stays null if the link has no key.

let countdownTimer = null;
let confirmTimer = null;

// --- Scenes ---

function goTo(nextScene) {
  scene = nextScene;
  render();
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Scenes 1 → 2 → 3: one timeline, each step waits for the previous one.
async function openLetter() {
  envelopeButton.disabled = true; // A second tap must not restart the animation.
  await openEnvelope(envelopeScene);
  await wait(CONFIG.letterPauseMs);
  await unfoldLetter(envelopeScene);
  await enterCelebration(CONFIG.cardDelayMs);
}

// Scenes 4 → 5: the party starts on its own; the card pops up a bit later.
async function enterCelebration(cardDelayMs) {
  goTo("celebration");
  playCelebration(celebrationScene);
  await wait(cardDelayMs);
  openCard();
}

function openCard() {
  cardReady = true;
  cardShown = true;
  render();
  closeCardButton.focus();
}

// Closing in the middle of the countdown cancels it: the circuit must never
// fire while the friend is not looking at the card.
function closeCard() {
  if (cardState === "counting") {
    stopCountdown();
    cardState = "idle";
  }
  cardShown = false;
  render();
  reopenCardButton.focus();
}

// --- Countdown card ---

function deviceReady() {
  return deviceState.brokerConnected && deviceState.deviceOnline;
}

function setCard(nextState) {
  cardState = nextState;
  render();
}

function startCountdown() {
  // If the LED is already on, switch it off now. That way the ON sent at the
  // end is a real change (OFF -> ON) that the page can notice.
  if (deviceState.ledIsOn) {
    device.sendOff();
  }
  count = CONFIG.countdownSeconds;
  setCard("counting");
  countdownTimer = setInterval(tick, 1000);
}

function tick() {
  count -= 1;
  if (count > 0) {
    render();
    return;
  }
  stopCountdown();
  activate();
}

function stopCountdown() {
  clearInterval(countdownTimer);
  countdownTimer = null;
}

function cancelCountdown() {
  stopCountdown();
  setCard("idle");
}

// Send the ON and wait: only the ESP32's answer can move the card to "done".
function activate() {
  device.sendOn();
  setCard("waiting");
  confirmTimer = setTimeout(() => setCard("error"), CONFIG.confirmTimeoutMs);
}

function repeat() {
  device.sendOff();
  setCard("idle");
}

function handleDeviceChange(newState) {
  // Rising edge: the LED was off and the ESP32 now says it is on.
  const ledJustTurnedOn = newState.ledIsOn && !deviceState.ledIsOn;
  deviceState = newState;

  if (cardState === "waiting" && ledJustTurnedOn) {
    clearTimeout(confirmTimer);
    cardState = "done";
  } else if (cardState === "counting" && !deviceReady()) {
    stopCountdown();
    cardState = "idle";
  }
  render();
}

function activateLabel() {
  if (!deviceState.brokerConnected) {
    return "Conectando...";
  }
  if (!deviceState.deviceOnline) {
    return "Circuito dormido";
  }
  return "Activar sorpresa";
}

// --- Drawing ---

// Shows the elements whose data-<key> matches value and hides the rest.
function showOnly(selector, key, value) {
  for (const element of document.querySelectorAll(selector)) {
    element.hidden = element.dataset[key] !== value;
  }
}

// Single place that decides what the page shows.
function render() {
  showOnly("[data-scene]", "scene", scene);
  cardOverlay.hidden = !cardShown;
  reopenCardButton.hidden = !(cardReady && !cardShown);
  showOnly("[data-card]", "card", cardState);

  activateButton.disabled = !deviceReady();
  activateButton.textContent = activateLabel();
  retryButton.disabled = !deviceReady();

  countNumber.textContent = count;
  ringProgress.style.strokeDashoffset = RING_LENGTH * (1 - count / CONFIG.countdownSeconds);
}

// --- Start ---

for (const slot of document.querySelectorAll("[data-friend-name]")) {
  slot.textContent = friendName;
}

// Setting src right away also preloads the GIFs, even inside hidden panels.
for (const image of document.querySelectorAll("[data-gif]")) {
  image.src = CONFIG.gifs[image.dataset.gif];
}

scatterStars(envelopeScene.querySelector(".stars"));
envelopeButton.addEventListener("click", openLetter);

activateButton.addEventListener("click", startCountdown);
cancelButton.addEventListener("click", cancelCountdown);
repeatButton.addEventListener("click", repeat);
retryButton.addEventListener("click", startCountdown);

closeCardButton.addEventListener("click", closeCard);
reopenCardButton.addEventListener("click", openCard);
// A click on the dimmed background (not on the card or the GIF) also closes it.
cardOverlay.addEventListener("click", (event) => {
  if (event.target === cardOverlay || event.target.classList.contains("card-layout")) {
    closeCard();
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && cardShown) {
    closeCard();
  }
});

if (topicKey) {
  device = connectDevice(CONFIG.brokerUrl, topicKey, handleDeviceChange);
} else {
  console.warn("Missing topic key: open this page with ?t=your-secret in the link.");
}

render();

if (devStart === "celebration") {
  enterCelebration(CONFIG.cardDelayMs);
} else if (devStart === "card") {
  enterCelebration(0);
}
