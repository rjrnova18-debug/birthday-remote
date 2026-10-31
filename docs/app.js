// Birthday Remote: toggles the ESP32 LED over MQTT and mirrors its real state.
// The secret part of the topic is NOT stored in this file. It comes from the
// link (?t=your-secret), so it never ends up in the public repository.

const BROKER_URL = "wss://broker.hivemq.com:8884/mqtt";

const button = document.getElementById("toggle-button");
const topicKey = new URLSearchParams(window.location.search).get("t");
const ledTopic = `${topicKey}/led`;
const stateTopic = `${topicKey}/state`;
const statusTopic = `${topicKey}/status`;

// What the page knows. Everything comes from the broker, nothing is guessed.
let brokerConnected = false; // Is this page connected to the broker?
let deviceOnline = false; // Did the ESP32 announce itself as online?
let ledIsOn = false; // Real LED state, as announced by the ESP32.

// Single place that decides how the button looks and whether it can be pressed.
// The label shows the action the button will perform next.
function render() {
  button.disabled = !(brokerConnected && deviceOnline);

  if (!brokerConnected) {
    button.textContent = "CONNECTING...";
  } else if (!deviceOnline) {
    button.textContent = "OFFLINE";
  } else {
    button.textContent = ledIsOn ? "OFF" : "ON";
  }
}

function handleMessage(topic, payload) {
  const message = payload.toString();

  if (topic === stateTopic) {
    ledIsOn = message === "ON";
  } else if (topic === statusTopic) {
    deviceOnline = message === "online";
  }
  render();
}

function startClient() {
  const client = mqtt.connect(BROKER_URL, { reconnectPeriod: 3000 });

  // Subscribe on every (re)connection. The broker immediately delivers the
  // retained messages, so the page learns the current state on load.
  client.on("connect", () => {
    client.subscribe([stateTopic, statusTopic]);
    brokerConnected = true;
    render();
  });
  client.on("close", () => {
    brokerConnected = false;
    render();
  });
  client.on("error", (error) => {
    console.error("MQTT error:", error);
  });
  client.on("message", handleMessage);

  // Send the command only. The label changes when the ESP32 confirms it.
  button.addEventListener("click", () => {
    client.publish(ledTopic, ledIsOn ? "OFF" : "ON");
  });
}

render();

if (topicKey) {
  startClient();
} else {
  console.warn("Missing topic key: open this page with ?t=your-secret in the link.");
}
