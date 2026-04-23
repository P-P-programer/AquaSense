#include <Arduino.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <WiFi.h>

#include "../esp32_ph_telemetry/config.h"

HardwareSerial RdmSerial(2);

struct RuntimeConfig {
  const char* apiBase;
};

RuntimeConfig getRuntimeConfig() {
#if ENV_TARGET == ENV_PRODUCTION
  return {API_BASE_PRODUCTION};
#else
  return {API_BASE_LOCAL};
#endif
}

RuntimeConfig runtimeConfig;

static const int RDM6300_RX_PIN = 16;
static const int RDM6300_TX_PIN = -1;
static const unsigned long RDM6300_BAUD_RATE = 9600;

static const int RELAY_PIN = 23;
static const bool RELAY_ACTIVE_LOW = true;
static const unsigned long RELAY_PULSE_MS = 1500UL;
static const unsigned long WIFI_RETRY_MS = 15000UL;
static const unsigned long VALIDATION_COOLDOWN_MS = 2000UL;
static const char* ACCESS_VALIDATE_PATH = "/api/access/rfid/validate";

String currentFrame;
String lastUid;
bool inFrame = false;
unsigned long relayOffAt = 0;
unsigned long lastWifiAttemptAt = 0;
unsigned long lastValidationAt = 0;

void setRelay(bool enabled) {
  if (RELAY_ACTIVE_LOW) {
    digitalWrite(RELAY_PIN, enabled ? LOW : HIGH);
  } else {
    digitalWrite(RELAY_PIN, enabled ? HIGH : LOW);
  }
}

String sanitizeUid(const String& raw) {
  String uid;

  for (size_t i = 0; i < raw.length(); i += 1) {
    char c = raw[i];
    if (isxdigit((unsigned char) c)) {
      uid += (char) toupper((unsigned char) c);
    }
  }

  if (uid.length() > 10) {
    uid = uid.substring(0, 10);
  }

  return uid;
}

void pulseRelay() {
  Serial.println("[RELAY] Door relay opened.");
  setRelay(true);
  relayOffAt = millis() + RELAY_PULSE_MS;
}

void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) {
    return;
  }

  unsigned long now = millis();
  if (lastWifiAttemptAt > 0 && now - lastWifiAttemptAt < WIFI_RETRY_MS) {
    return;
  }

  lastWifiAttemptAt = now;
  Serial.printf("[WiFi] Connecting to %s...\n", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long startedAt = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startedAt < 15000UL) {
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

bool responseAllowsAccess(const String& responseBody) {
  String normalized = responseBody;
  normalized.toLowerCase();

  return normalized.indexOf("\"allowed\":true") >= 0 || normalized.indexOf("\"allow\":true") >= 0;
}

bool validateUidWithApi(const String& uid) {
  connectWiFi();

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[ACCESS] WiFi unavailable, cannot validate against API.");
    return false;
  }

  HTTPClient http;
  String url = String(runtimeConfig.apiBase) + ACCESS_VALIDATE_PATH;
  bool useHttps = url.startsWith("https://");
  WiFiClient plainClient;
  WiFiClientSecure secureClient;

  if (useHttps) {
    secureClient.setInsecure();
    if (!http.begin(secureClient, url)) {
      Serial.println("[ACCESS] Unable to init HTTPS client.");
      return false;
    }
  } else if (!http.begin(plainClient, url)) {
    Serial.println("[ACCESS] Unable to init HTTP client.");
    return false;
  }

  http.setTimeout(8000);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Accept", "application/json");

  String payload = "{";
  payload += "\"uid\":\"" + uid + "\",";
  payload += "\"device_identifier\":\"" + String(DEVICE_IDENTIFIER) + "\"";
  payload += "}";

  int statusCode = http.POST(payload);
  String response = http.getString();

  Serial.printf("[ACCESS] POST %s -> %d\n", url.c_str(), statusCode);
  Serial.printf("[ACCESS] Payload: %s\n", payload.c_str());
  Serial.printf("[ACCESS] Response: %s\n", response.c_str());

  http.end();

  if (statusCode < 200 || statusCode >= 300) {
    return false;
  }

  return responseAllowsAccess(response);
}

void handleUid(const String& uid, const String& rawFrame) {
  Serial.printf("[RDM6300] RAW: %s\n", rawFrame.c_str());
  Serial.printf("[RDM6300] UID: %s\n", uid.c_str());

  unsigned long now = millis();
  if (uid.length() == 0) {
    Serial.println("[ACCESS] Empty UID ignored.");
    return;
  }

  if (uid == lastUid && now - lastValidationAt < VALIDATION_COOLDOWN_MS) {
    Serial.println("[ACCESS] Duplicate UID ignored during cooldown.");
    return;
  }

  lastUid = uid;
  lastValidationAt = now;

  if (validateUidWithApi(uid)) {
    Serial.println("[ACCESS] UID allowed. Relay pulse triggered.");
    pulseRelay();
  } else {
    Serial.println("[ACCESS] UID not allowed yet.");
  }
}

void readRdm6300() {
  while (RdmSerial.available() > 0) {
    int incoming = RdmSerial.read();

    if (incoming < 0) {
      continue;
    }

    if (incoming == 0x02) {
      inFrame = true;
      currentFrame = "";
      continue;
    }

    if (incoming == 0x03) {
      if (inFrame && currentFrame.length() > 0) {
        String uid = sanitizeUid(currentFrame);
        handleUid(uid, currentFrame);
      }

      inFrame = false;
      currentFrame = "";
      continue;
    }

    if (incoming == '\r' || incoming == '\n') {
      if (inFrame && currentFrame.length() > 0) {
        String uid = sanitizeUid(currentFrame);
        handleUid(uid, currentFrame);
        inFrame = false;
        currentFrame = "";
      }
      continue;
    }

    if (isPrintable(incoming)) {
      currentFrame += (char) incoming;
    }

    if (currentFrame.length() > 32) {
      currentFrame.remove(0, currentFrame.length() - 32);
    }
  }
}

void setup() {
  Serial.begin(115200);
  delay(500);

  pinMode(RELAY_PIN, OUTPUT);
  setRelay(false);

  RdmSerial.begin(RDM6300_BAUD_RATE, SERIAL_8N1, RDM6300_RX_PIN, RDM6300_TX_PIN);

  WiFi.mode(WIFI_STA);

  Serial.println("====================================");
  Serial.println("AquaSense RDM6300 access validation");
  Serial.printf("RDM6300 RX pin: %d\n", RDM6300_RX_PIN);
  Serial.printf("Relay pin: %d\n", RELAY_PIN);
  runtimeConfig = getRuntimeConfig();

  Serial.printf("API base: %s\n", runtimeConfig.apiBase);
  Serial.println("This sketch reuses the shared config.h from the telemetry firmware.");
  Serial.println("====================================");

  connectWiFi();
}

void loop() {
  readRdm6300();

  if (relayOffAt > 0 && millis() >= relayOffAt) {
    setRelay(false);
    relayOffAt = 0;
    Serial.println("[RELAY] Door relay closed.");
  }

  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }

  delay(10);
}