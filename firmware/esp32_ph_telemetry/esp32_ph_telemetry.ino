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
unsigned long telemetrySendCount = 0;
float simulatedPh = PH_BASE;
String simulatedPowerSource = "mains";
int simulatedBackupLevel = 100;
String simulatedPowerEventAt = "";
int lastPhRaw = 0;
float lastPhVoltage = 0.0f;

void setupPhSensor() {
  analogReadResolution(12);
  analogSetPinAttenuation(PH_SENSOR_PIN, ADC_11db);
}

float readPhFromSensor() {
  long rawSum = 0;

  for (int i = 0; i < PH_SENSOR_SAMPLES; i += 1) {
    rawSum += analogRead(PH_SENSOR_PIN);
    delay(5);
  }

  lastPhRaw = (int)round((float)rawSum / (float)PH_SENSOR_SAMPLES);
  lastPhVoltage = ((float)lastPhRaw / 4095.0f) * 3.3f;

  // Approximate conversion for E-201-C style modules.
  float phValue = 7.0f + ((PH_SENSOR_VOLTAGE_AT_PH7 - lastPhVoltage) / PH_SENSOR_VOLTAGE_PER_PH);

  if (phValue < 0.0f) phValue = 0.0f;
  if (phValue > 14.0f) phValue = 14.0f;

  return phValue;
}

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

float getPhValue() {
  if (PH_SENSOR_ENABLED) {
    return readPhFromSensor();
  }

  return nextSimulatedPh();
}

void maybeSimulatePowerSource() {
  if (!POWER_SIMULATION_ENABLED) {
    return;
  }

  telemetrySendCount++;

  if (telemetrySendCount < POWER_SIMULATION_MIN_SENDS_BETWEEN_EVENTS) {
    return;
  }

  if (random(0, 100) >= POWER_SIMULATION_CHANCE_PERCENT) {
    return;
  }

  telemetrySendCount = 0;
  if (simulatedPowerSource == "mains") {
    simulatedPowerSource = "backup";
    simulatedBackupLevel = random(POWER_SIMULATION_BACKUP_MIN_LEVEL, POWER_SIMULATION_BACKUP_MAX_LEVEL + 1);
    simulatedPowerEventAt = isoNow();
    Serial.printf("[PowerSim] Switching to BACKUP (%d%%)\n", simulatedBackupLevel);
  } else {
    simulatedPowerSource = "mains";
    simulatedBackupLevel = 100;
    simulatedPowerEventAt = isoNow();
    Serial.println("[PowerSim] Switching to MAINS");
  }
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

  float phValue = getPhValue();
  String capturedAt = isoNow();

  maybeSimulatePowerSource();

  String payload = "{";
  payload += "\"ph\":" + String(phValue, 2) + ",";
  payload += "\"ph_raw\":" + String(lastPhRaw) + ",";
  payload += "\"ph_voltage\":" + String(lastPhVoltage, 3) + ",";
  payload += "\"consumo\":0,";
  payload += "\"turbidez\":0,";
  payload += "\"temperatura\":0,";
  payload += "\"power_source\":\"" + simulatedPowerSource + "\",";
  payload += "\"backup_level\":" + String(simulatedBackupLevel) + ",";
  if (simulatedPowerEventAt.length() > 0) {
    payload += "\"power_event_at\":\"" + simulatedPowerEventAt + "\",";
  }
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
  Serial.printf("[pH] raw=%d voltage=%.3fV ph=%.2f\n", lastPhRaw, lastPhVoltage, phValue);

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
  setupPhSensor();

#if ENV_TARGET == ENV_PRODUCTION
  Serial.println("[Config] Environment: PRODUCTION");
#else
  Serial.println("[Config] Environment: LOCAL");
#endif

  Serial.printf("[Config] API base: %s\n", runtimeConfig.apiBase);
  Serial.printf("[Config] Device identifier: %s\n", DEVICE_IDENTIFIER);
  Serial.printf("[Config] Power simulation: %s\n", POWER_SIMULATION_ENABLED ? "ENABLED" : "DISABLED");

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
