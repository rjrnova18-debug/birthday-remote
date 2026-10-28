#include <Arduino.h>
#include <WiFi.h>
#include "secrets.h"
#include <PubSubClient.h>

constexpr char MQTT_BROKER[] = "broker.hivemq.com";
constexpr uint16_t MQTT_PORT = 1883;
constexpr uint8_t LED_PIN = LED_BUILTIN;

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

void setup()
{
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);

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
}
