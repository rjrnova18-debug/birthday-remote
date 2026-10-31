// Talks to the ESP32 through the MQTT broker.
// It knows nothing about the page: it only remembers what the ESP32 announced
// and calls onChange() every time that changes.

export function connectDevice(brokerUrl, topicKey, onChange) {
  const ledTopic = `${topicKey}/led`;
  const stateTopic = `${topicKey}/state`;
  const statusTopic = `${topicKey}/status`;

  // Everything comes from the broker, nothing is guessed.
  const state = {
    brokerConnected: false, // Is this page connected to the broker?
    deviceOnline: false, // Did the ESP32 announce itself as online?
    ledIsOn: false, // Real LED state, as announced by the ESP32.
  };

  // Hand out a copy, so nobody outside can change the state by accident.
  function notify() {
    onChange({ ...state });
  }

  function handleMessage(topic, payload) {
    const message = payload.toString();

    if (topic === stateTopic) {
      state.ledIsOn = message === "ON";
    } else if (topic === statusTopic) {
      state.deviceOnline = message === "online";
    }
    notify();
  }

  const client = mqtt.connect(brokerUrl, { reconnectPeriod: 3000 });

  // Subscribe on every (re)connection. The broker immediately delivers the
  // retained messages, so the page learns the current state on load.
  client.on("connect", () => {
    client.subscribe([stateTopic, statusTopic]);
    state.brokerConnected = true;
    notify();
  });
  client.on("close", () => {
    state.brokerConnected = false;
    notify();
  });
  client.on("error", (error) => {
    console.error("MQTT error:", error);
  });
  client.on("message", handleMessage);

  // Only send commands. The real result arrives later through onChange().
  return {
    sendOn: () => client.publish(ledTopic, "ON"),
    sendOff: () => client.publish(ledTopic, "OFF"),
  };
}
