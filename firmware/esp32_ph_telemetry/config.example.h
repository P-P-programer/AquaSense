#pragma once

/**
 * Copy this file as config.h and edit your real values.
 *
 * 1) cp config.example.h config.h
 * 2) Fill WiFi credentials and API tokens.
 * 3) Select target environment with ENV_TARGET.
 */

// ---------- Environment Selection ----------
#define ENV_LOCAL 0
#define ENV_PRODUCTION 1

// Switch between local and production quickly.
#define ENV_TARGET ENV_LOCAL

// ---------- WiFi ----------
static const char* WIFI_SSID = "YOUR_WIFI_SSID";
static const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// ---------- Device Identity ----------
static const char* DEVICE_IDENTIFIER = "esp32-dev-001";

// ---------- API Endpoints ----------
// Keep protocol+host without trailing slash.
static const char* API_BASE_LOCAL = "http://192.168.1.100:8000";
static const char* API_BASE_PRODUCTION = "https://your-domain.com";

// ---------- Device Tokens ----------
// Generate from admin panel -> device -> token.
static const char* DEVICE_TOKEN_LOCAL = "AS_LOCAL_TOKEN_HERE";
static const char* DEVICE_TOKEN_PRODUCTION = "AS_PROD_TOKEN_HERE";

// ---------- Telemetry Behavior ----------
// 20s heartbeat by default.
static const unsigned long SEND_INTERVAL_MS = 20000UL;

// pH simulation: baseline + random drift.
static const float PH_BASE = 7.0f;
static const float PH_MIN = 6.2f;
static const float PH_MAX = 8.4f;

// Demo location (replace with real GPS later).
static const double DEMO_LATITUDE = 4.7110000;
static const double DEMO_LONGITUDE = -74.0721000;
static const int DEMO_ACCURACY_M = 12;
