# AquaSense Firmware

This folder contains ESP32 firmware examples for AquaSense ingestion tests.

## Quick Start (Simulated pH)

1. Open `firmware/esp32_ph_telemetry/esp32_ph_telemetry.ino` in Arduino IDE.
2. Copy `config.example.h` as `config.h`.
3. Fill WiFi and token values in `config.h`.
4. Select environment:
   - `#define ENV_TARGET ENV_LOCAL`
   - or `#define ENV_TARGET ENV_PRODUCTION`
5. Upload to ESP32.

The sketch sends heartbeat telemetry every 20 seconds to:

`POST /api/devices/ingest`

Including:
- simulated `ph`
- static demo `latitude/longitude`
- `captured_at`
- device token in `X-Device-Token`

## Notes

- This version uses simulated pH until the real pH probe is available.
- For ESP32-CAM tests, network and telemetry still work, but analog pH reading should be moved to external ADC (e.g., ADS1115) when using real sensor.
- Never commit real secrets in `config.h`.
