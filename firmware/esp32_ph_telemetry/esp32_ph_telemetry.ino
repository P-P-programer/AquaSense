#include <WiFi.h>
#include <HTTPClient.h>
#include <time.h>

#include "config.h"

struct RuntimeConfig {
  const char* apiBase;
  const char* deviceToken;
};

RuntimeConfig getRuntimeConfig() {
#if ENV_TARGET == ENV_PRODUCTION
  return {API_BASE_PRODUCTION, DEVICE_TOKEN_PRODUCTION};
#else
  return {API_BASE_LOCAL, DEVICE_TOKEN_LOCAL};
#endif
}

RuntimeConfig runtimeConfig;
unsigned long lastSendAt = 0;
float simulatedPh = PH_BASE;

void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;

  Serial.printf("[WiFi] Connecting to %s...\n", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 15000) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("[WiFi] Connected. IP: %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("[WiFi] Connection timeout.");
  }
}

String isoNow() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo, 500)) {
    return "";
  }

  char buffer[32];
  strftime(buffer, sizeof(buffer), "%Y-%m-%dT%H:%M:%SZ", &timeinfo);
  return String(buffer);
}

float nextSimulatedPh() {
  // Random walk of +/- 0.03 with hard limits.
  float delta = ((float)random(-30, 31)) / 1000.0f;
  simulatedPh += delta;

  if (simulatedPh < PH_MIN) simulatedPh = PH_MIN;
  if (simulatedPh > PH_MAX) simulatedPh = PH_MAX;

  return simulatedPh;
}

bool sendTelemetry() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[Telemetry] WiFi disconnected, skipping send.");
    return false;
  }

  HTTPClient http;
  String url = String(runtimeConfig.apiBase) + "/api/devices/ingest";

  if (!http.begin(url)) {
    Serial.println("[Telemetry] Unable to init HTTP client.");
    return false;
  }

  http.addHeader("Content-Type", "application/json");
  http.addHeader("Accept", "application/json");
  http.addHeader("X-Device-Token", runtimeConfig.deviceToken);

  float phValue = nextSimulatedPh();
  String capturedAt = isoNow();

  String payload = "{";
  payload += "\"ph\":" + String(phValue, 2) + ",";
  payload += "\"consumo\":0,";
  payload += "\"turbidez\":0,";
  payload += "\"temperatura\":0,";
  payload += "\"latitude\":" + String(DEMO_LATITUDE, 7) + ",";
  payload += "\"longitude\":" + String(DEMO_LONGITUDE, 7) + ",";
  payload += "\"accuracy_m\":" + String(DEMO_ACCURACY_M) + ",";
  payload += "\"source_device\":\"" + String(DEVICE_IDENTIFIER) + "\"";

  if (capturedAt.length() > 0) {
    payload += ",\"captured_at\":\"" + capturedAt + "\"";
  }

  payload += "}";

  int statusCode = http.POST(payload);
  String response = http.getString();

  Serial.printf("[Telemetry] POST %s -> %d\n", url.c_str(), statusCode);
  Serial.printf("[Telemetry] Payload: %s\n", payload.c_str());
  Serial.printf("[Telemetry] Response: %s\n", response.c_str());

  http.end();

  return statusCode >= 200 && statusCode < 300;
}

void setupTime() {
  configTime(0, 0, "pool.ntp.org", "time.nist.gov");
}

void setup() {
  Serial.begin(115200);
  delay(500);

  randomSeed((unsigned long)esp_random());
  runtimeConfig = getRuntimeConfig();

#if ENV_TARGET == ENV_PRODUCTION
  Serial.println("[Config] Environment: PRODUCTION");
#else
  Serial.println("[Config] Environment: LOCAL");
#endif

  Serial.printf("[Config] API base: %s\n", runtimeConfig.apiBase);
  Serial.printf("[Config] Device identifier: %s\n", DEVICE_IDENTIFIER);

  connectWiFi();
  setupTime();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }

  unsigned long now = millis();
  if (now - lastSendAt >= SEND_INTERVAL_MS) {
    sendTelemetry();
    lastSendAt = now;
  }

  delay(100);
}
