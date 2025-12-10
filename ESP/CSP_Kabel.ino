#include <DHT.h>

#define DHTPIN 14
#define DHTTYPE DHT22

DHT dht(DHTPIN, DHTTYPE);

void setup() {
  Serial.begin(9600);
  dht.begin();
}

void loop() {
  float temp = dht.readTemperature();
  float hum  = dht.readHumidity();

  // JSON przez Serial
  Serial.print("{");
  Serial.print("\"temp\":");
  Serial.print(temp, 1);
  Serial.print(",");
  Serial.print("\"hum\":");
  Serial.print(hum, 1);
  Serial.println("}");

  delay(2000);
}
