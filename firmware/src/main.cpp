#include <Arduino.h>
#include <WiFi.h>
#include "secrets.h"
#include "melody.h"
#include "Led.h"
#include "MelodyPlayer.h"
#include "LightShow.h"
#include "finale.h"
#include <PubSubClient.h>

constexpr char MQTT_BROKER[] = "broker.hivemq.com";
constexpr uint16_t MQTT_PORT = 1883;
constexpr uint8_t LED_PIN = LED_BUILTIN;
constexpr uint8_t BUZZER_PIN = 25;

WiFiClient wifiClient;
PubSubClient mqttClient(wifiClient);
Led leds[] = {Led(26), Led(27), Led(32), Led(33)}; // yellow, green, red, blue
MelodyPlayer player(BUZZER_PIN);
constexpr size_t LED_COUNT = sizeof(leds) / sizeof(leds[0]);
LightShow lights(leds, LED_COUNT);

// The whole show, from the ON to the end: first the song, then the finale.
enum class Show
{
  Off,
  Song,
  Finale
};
Show show = Show::Off;

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
  for (Led &led : leds)
  {
    led.turnOn();
    delay(200);
    led.turnOff();
  }
  tone(BUZZER_PIN, NOTE_C5);
  delay(150);
  noTone(BUZZER_PIN);
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
    if (show == Show::Off)
    {
      player.start(HAPPY_BIRTHDAY, HAPPY_BIRTHDAY_LENGTH);
      show = Show::Song;
      setLed(true);
    }
  }
  else if (message == "OFF")
  {
    player.stop();
    lights.stop();
    show = Show::Off;
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

// Which LED shows this pitch: 0 = lowest band ... 3 = highest, -1 = silence.
// Each limit sits halfway between the top note of one band and the bottom note of the next.
int ledIndexForFrequency(uint16_t frequencyHz)
{
  if (frequencyHz == 0)
  {
    return -1; // silence: no LED
  }
  else if (frequencyHz < (NOTE_A4 + NOTE_B4) / 2)
  {
    return 0; // yellow: G4, A4
  }
  else if (frequencyHz < (NOTE_C5 + NOTE_D5) / 2)
  {
    return 1; // green: B4, C5
  }
  else if (frequencyHz < (NOTE_E5 + NOTE_F5) / 2)
  {
    return 2; // red: D5, E5
  }
  return 3; // blue: F5, G5
}

// The LED mask for the note playing now: one bit for its band, none in silence.
uint8_t maskForCurrentNote()
{
  int index = ledIndexForFrequency(player.currentFrequency());
  return index >= 0 ? (1 << index) : NO_LEDS;
}

// Moves the show forward: the LEDs follow the notes, then the finale, then OFF.
void updateShow()
{
  switch (show)
  {
  case Show::Off:
    break;

  case Show::Song:
    lights.show(maskForCurrentNote());
    if (!player.isPlaying())
    {
      lights.start(FINALE, FINALE_LENGTH);
      show = Show::Finale;
    }
    break;

  case Show::Finale:
    if (!lights.isPlaying())
    {
      show = Show::Off;
      setLed(false);
    }
    break;
  }
}

void setup()
{
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
  player.begin();
  for (Led &led : leds)
  {
    led.begin();
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
  player.update();
  lights.update();
  updateShow();
  printHeartbeat();
}
