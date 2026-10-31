// Birthday Remote page: decides which scene is visible and draws it from
// what device.js reports. It knows nothing about MQTT.
// The secret topic key and the friend's name come from the link
// (?t=your-secret&n=Name), so neither ends up in the public repository.

import { connectDevice } from "./device.js";

// Everything you may want to tweak lives here. Nothing secret.
const CONFIG = {
  brokerUrl: "wss://broker.hivemq.com:8884/mqtt",
  defaultName: "amigo",
  countdownSeconds: 5,
  confirmTimeoutMs: 5000, // How long to wait for the ESP32 to confirm the ON.
  gifs: {
    sticker: "https://i.pinimg.com/originals/3c/75/75/3c75754e5daa43f5f2618a587f449544.gif",
    success: "https://media1.tenor.com/m/g16jQZqbvWoAAAAC/yippee-happy.gif",
  },
};

// The scenes, in the order the friend sees them.
const SCENES = ["envelope", "opening", "unfold", "celebration", "card"];

// Length of the countdown ring's circle (2 * PI * radius 96), used to empty it.
const RING_LENGTH = 2 * Math.PI * 96;

const params = new URLSearchParams(window.location.search);
const topicKey = params.get("t");
const friendName = params.get("n") || CONFIG.defaultName;
// ?s=card jumps straight to a scene: handy while developing.
const firstScene = SCENES.includes(params.get("s")) ? params.get("s") : SCENES[0];

const activateButton = document.getElementById("activate-button");
const cancelButton = document.getElementById("cancel-button");
const repeatButton = document.getElementById("repeat-button");
const retryButton = document.getElementById("retry-button");
const countNumber = document.getElementById("count-number");
const ringProgress = document.getElementById("ring-progress");

// What the page knows.
let scene = firstScene;
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

function goToNextScene() {
  const index = SCENES.indexOf(scene);
  if (index < SCENES.length - 1) {
    goTo(SCENES[index + 1]);
  }
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

for (const button of document.querySelectorAll(".next-button")) {
  button.addEventListener("click", goToNextScene);
}

activateButton.addEventListener("click", startCountdown);
cancelButton.addEventListener("click", cancelCountdown);
repeatButton.addEventListener("click", repeat);
retryButton.addEventListener("click", startCountdown);

if (topicKey) {
  device = connectDevice(CONFIG.brokerUrl, topicKey, handleDeviceChange);
} else {
  console.warn("Missing topic key: open this page with ?t=your-secret in the link.");
}

render();
