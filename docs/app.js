// Birthday Remote: toggles the ESP32 LED over MQTT.
// The secret part of the topic is NOT stored in this file. It comes from the
// link (?t=your-secret), so it never ends up in the public repository.

const BROKER_URL = "wss://broker.hivemq.com:8884/mqtt";

const button = document.getElementById("toggle-button");
const topicKey = new URLSearchParams(window.location.search).get("t");
const ledTopic = `${topicKey}/led`;

let ledIsOn = false;

// The button always shows the action it will perform next.
function updateButton() {
  button.textContent = ledIsOn ? "OFF" : "ON";
}

function startClient() {
  const client = mqtt.connect(BROKER_URL, { reconnectPeriod: 3000 });

  // Enable the button only while we are connected to the broker.
  client.on("connect", () => {
    button.disabled = false;
  });
  client.on("close", () => {
    button.disabled = true;
  });
  client.on("error", (error) => {
    console.error("MQTT error:", error);
  });

  button.addEventListener("click", () => {
    const command = ledIsOn ? "OFF" : "ON";
    client.publish(ledTopic, command);
    ledIsOn = !ledIsOn;
    updateButton();
  });
}

if (topicKey) {
  startClient();
} else {
  console.warn("Missing topic key: open this page with ?t=your-secret in the link.");
}
