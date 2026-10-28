// Birthday Remote: toggles the ESP32 LED over MQTT and mirrors its real state.
// The secret part of the topic is NOT stored in this file. It comes from the
// link (?t=your-secret), so it never ends up in the public repository.

const BROKER_URL = "wss://broker.hivemq.com:8884/mqtt";

const button = document.getElementById("toggle-button");
const topicKey = new URLSearchParams(window.location.search).get("t");
const ledTopic = `${topicKey}/led`;
const stateTopic = `${topicKey}/state`;

// Real state of the LED, as announced by the ESP32 (never guessed by the page).
let ledIsOn = false;

// The button always shows the action it will perform next.
function updateButton() {
  button.textContent = ledIsOn ? "OFF" : "ON";
}

function startClient() {
  const client = mqtt.connect(BROKER_URL, { reconnectPeriod: 3000 });

  // Subscribe on every (re)connection. The broker immediately delivers the
  // retained message, so the page learns the current state on load.
  client.on("connect", () => {
    client.subscribe(stateTopic);
    button.disabled = false;
  });
  client.on("close", () => {
    button.disabled = true;
  });
  client.on("error", (error) => {
    console.error("MQTT error:", error);
  });

  client.on("message", (topic, payload) => {
    if (topic !== stateTopic) {
      return;
    }
    ledIsOn = payload.toString() === "ON";
    updateButton();
  });

  // Send the command only. The label changes when the ESP32 confirms it.
  button.addEventListener("click", () => {
    client.publish(ledTopic, ledIsOn ? "OFF" : "ON");
  });
}

if (topicKey) {
  startClient();
} else {
  console.warn("Missing topic key: open this page with ?t=your-secret in the link.");
}
