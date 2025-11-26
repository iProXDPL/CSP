#include <WiFi.h>
#include <WebServer.h>
#include <DHT.h>

#define DHTPIN 14
#define DHTTYPE DHT22

DHT dht(DHTPIN, DHTTYPE);
WebServer server(80);

const char* ssid = "";
const char* password = "";

void setup() {
  Serial.begin(115200);
  dht.begin();

  WiFi.begin(ssid, password);

  int timeout = 0;
  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    delay(500);
    timeout++;
    if (timeout > 40) {
      Serial.println("Nie udalo sie polaczyc z WiFi");
      break;
    }
  }

  Serial.println();
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());

  server.on("/data", []() {
    float t = dht.readTemperature();
    float h = dht.readHumidity();

    if (isnan(t) || isnan(h)) {
      server.send(500, "application/json", "{\"error\":\"DHT read failed\"}");
      return;
    }

    String json = "{";
    json += "\"temp\":" + String(t, 1) + ",";
    json += "\"hum\":" + String(h, 1);
    json += "}";

    server.send(200, "application/json", json);
  });

  server.begin();
}

void loop() {
  server.handleClient();
}
