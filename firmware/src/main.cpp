#include <Arduino.h>
#include <WiFi.h>
#include "secrets.h"
#include "melody.h"
#include <PubSubClient.h>

constexpr char MQTT_BROKER[] = "broker.hivemq.com";
constexpr uint16_t MQTT_PORT = 1883;
constexpr uint8_t LED_PIN = LED_BUILTIN;
constexpr uint8_t BUZZER_PIN = 25;
constexpr uint8_t LED_PINS[] = {26, 27, 32, 33}; // yellow, green, red, blue
constexpr uint16_t NOTE_GAP_MS = 30;             // so two equal notes sound as two

WiFiClient wifiClient;
PubSubClient mqttClient(wifiClient);
bool ledIsOn = false;

void connectToWiFi()
{
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED)
  {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.print("Connected! IP address: ");
  Serial.println(WiFi.localIP());
}

void testHardware()
{
  for (uint8_t pin : LED_PINS)
  {
    digitalWrite(pin, HIGH);
    delay(200);
    digitalWrite(pin, LOW);
  }
  tone(BUZZER_PIN, NOTE_C5);
  delay(150);
  noTone(BUZZER_PIN);
}

// Step 3A on purpose: this blocks loop() for the whole song (~12 s).
void playMelodyBlocking()
{
  for (const Note &note : HAPPY_BIRTHDAY)
  {
    tone(BUZZER_PIN, note.frequencyHz);
    delay(note.durationMs - NOTE_GAP_MS);
    noTone(BUZZER_PIN);
    delay(NOTE_GAP_MS);
  }
}

void publishLedState()
{
  mqttClient.publish(MQTT_TOPIC_STATE, ledIsOn ? "ON" : "OFF", true);
}

void setLed(bool turnOn)
{
  ledIsOn = turnOn;
  digitalWrite(LED_PIN, ledIsOn ? HIGH : LOW);
  publishLedState();
}

void onMessage(char *topic, byte *payload, unsigned int length)
{
  String message;
  for (unsigned int i = 0; i < length; i++)
  {
    message += static_cast<char>(payload[i]);
  }
  Serial.printf("Message on %s: %s\n", topic, message.c_str());

  if (message == "ON")
  {
    setLed(true);
    playMelodyBlocking();
    setLed(false);
  }
  else if (message == "OFF")
  {
    setLed(false);
  }
}

void connectToMqtt()
{
  while (!mqttClient.connected())
  {
    Serial.print("Connecting to MQTT...");
    String clientId = "birthday-remote-" + String(random(0xffff), HEX);

    if (mqttClient.connect(clientId.c_str(), nullptr, nullptr, MQTT_TOPIC_STATUS, 0, true, "offline"))
    {
      Serial.println(" connected");
      mqttClient.publish(MQTT_TOPIC_STATUS, "online", true);
      mqttClient.subscribe(MQTT_TOPIC_LED);
      publishLedState();
    }
    else
    {
      Serial.printf(" failed, rc=%d. Retrying in 5 s\n", mqttClient.state());
      delay(5000);
    }
  }
}

// Temporary diagnostic: prints once per second while loop() keeps running.
void printHeartbeat()
{
  static unsigned long lastBeatMs = 0;
  if (millis() - lastBeatMs >= 1000)
  {
    lastBeatMs = millis();
    Serial.printf("loop alive at %lu ms\n", lastBeatMs);
  }
}

void setup()
{
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  for (uint8_t pin : LED_PINS)
  {
    pinMode(pin, OUTPUT);
  }

  testHardware();

  connectToWiFi();

  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setCallback(onMessage);
}

void loop()
{
  if (!mqttClient.connected())
  {
    connectToMqtt();
  }
  mqttClient.loop();
  printHeartbeat();
}
