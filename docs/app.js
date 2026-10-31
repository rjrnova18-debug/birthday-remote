// Birthday Remote page: decides which scene is visible and draws it from
// what device.js reports. It knows nothing about MQTT.
// The secret topic key and the friend's name come from the link
// (?t=your-secret&n=Name), so neither ends up in the public repository.

import { connectDevice } from "./device.js";

// Everything you may want to tweak lives here. Nothing secret.
const CONFIG = {
  brokerUrl: "wss://broker.hivemq.com:8884/mqtt",
  defaultName: "amigo",
};

// The scenes, in the order the friend sees them.
const SCENES = ["envelope", "opening", "unfold", "celebration", "card"];

const params = new URLSearchParams(window.location.search);
const topicKey = params.get("t");
const friendName = params.get("n") || CONFIG.defaultName;

const toggleButton = document.getElementById("toggle-button");

// What the page knows.
let scene = SCENES[0];
let deviceState = { brokerConnected: false, deviceOnline: false, ledIsOn: false };
let device = null; // Commands for the ESP32; stays null if the link has no key.

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

// Single place that decides what the page shows.
function render() {
  for (const section of document.querySelectorAll("[data-scene]")) {
    section.hidden = section.dataset.scene !== scene;
  }

  toggleButton.disabled = !(deviceState.brokerConnected && deviceState.deviceOnline);

  if (!deviceState.brokerConnected) {
    toggleButton.textContent = "CONNECTING...";
  } else if (!deviceState.deviceOnline) {
    toggleButton.textContent = "OFFLINE";
  } else {
    toggleButton.textContent = deviceState.ledIsOn ? "OFF" : "ON";
  }
}

// --- Start ---

for (const slot of document.querySelectorAll("[data-friend-name]")) {
  slot.textContent = friendName;
}

for (const button of document.querySelectorAll(".next-button")) {
  button.addEventListener("click", goToNextScene);
}

// Send the command only. The label changes when the ESP32 confirms it.
toggleButton.addEventListener("click", () => {
  if (deviceState.ledIsOn) {
    device.sendOff();
  } else {
    device.sendOn();
  }
});

if (topicKey) {
  device = connectDevice(CONFIG.brokerUrl, topicKey, (newState) => {
    deviceState = newState;
    render();
  });
} else {
  console.warn("Missing topic key: open this page with ?t=your-secret in the link.");
}

render();
