#define ENABLE_LEGACY_TOKEN
#define ENABLE_DATABASE

#include <WiFi.h>
#include <DHT.h>
#include <FirebaseClient.h>
#include <WiFiClientSecure.h>
#include "time.h"

#define WIFI_SSID     ""
#define WIFI_PASSWORD ""

#define DHTPIN 14
#define DHTTYPE DHT22
DHT dht(DHTPIN, DHTTYPE);

#define DATABASE_URL    ""
#define DATABASE_SECRET ""


#define NTP_SERVER "0.pl.pool.ntp.org"
#define GMT_OFFSET_SEC 3600
#define DAYLIGHT_OFFSET_SEC 3600

WiFiClientSecure ssl_client;

using AsyncClient = AsyncClientClass;
AsyncClient aClient(ssl_client);

LegacyToken legacy_token(DATABASE_SECRET);
FirebaseApp app;
RealtimeDatabase Database;

unsigned long getTimestamp() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) {
    return 0;
  }
  return mktime(&timeinfo);
}

void setup() {
  Serial.begin(115200);
  delay(1000);  
  dht.begin();

  // Wi-Fi
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Laczenie z Wi-Fi");
  
  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    delay(300);
  }
  
  Serial.println();
  Serial.print("Connected with IP: ");
  Serial.println(WiFi.localIP());
  Serial.println();

  // NTP
  configTime(GMT_OFFSET_SEC, DAYLIGHT_OFFSET_SEC, NTP_SERVER);
  Serial.println("NTP skonfigurowane");

  // Firebase
  Firebase.printf("Firebase Client v%s\n", FIREBASE_CLIENT_VERSION);
  
  ssl_client.setInsecure();
  
  Serial.println("Initializing app...");
  initializeApp(aClient, app, getAuth(legacy_token));
  
  app.getApp<RealtimeDatabase>(Database);
  Database.url(DATABASE_URL);
  
  Serial.println("Firebase zainicjalizowane");
}

void loop() {
  app.loop();
  
  if (!app.ready()) {
    return;
  }
  
  float temp = dht.readTemperature();
  float hum = dht.readHumidity();
  
  if (isnan(temp) || isnan(hum)) {
    Serial.println("Blad odczytu DHT22");
    delay(5000);
    return;
  }

  unsigned long ts = getTimestamp();

  Serial.printf("Temp: %.1f C, Wilg: %.1f%%, TS: %lu\n", temp, hum, ts);

  String jsonStr = "{";
  jsonStr += "\"temp\":" + String(temp, 1) + ",";
  jsonStr += "\"hum\":" + String(hum, 1) + ",";
  jsonStr += "\"timestamp\":" + String(ts);
  jsonStr += "}";

  object_t json(jsonStr);

  String path = "/data";
  String name = Database.push<object_t>(aClient, path, json);
  
  if (aClient.lastError().code() == 0) {
    Serial.println("Dane wyslane do Firebase");
    Serial.print("Klucz: ");
    Serial.println(name);
  } else {
    Serial.print("Blad wysylania: ");
    Serial.println(aClient.lastError().message());
  }

  delay(2000);
}