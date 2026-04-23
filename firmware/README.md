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

## Temporary RDM6300 Access Test

For RFID access testing, open `firmware/rdm6300_access_test/rdm6300_access_test.ino` in Arduino IDE.

This sketch is temporary and intended to:

- read the RDM6300 UID over Serial2
- print the raw card code in the Serial Monitor
- validate the UID against the API and pulse a relay on GPIO 23 when allowed

The sketch reuses the shared `config.h` pattern for WiFi and API values. Copy the example config used by the main ESP32 sketch, fill your credentials locally, and keep the access test sketch out of version control if you want to avoid committing secrets.

After you capture the UID, add it to the database with `tinker` and then switch the sketch from test mode to validation mode.

## Notes

- This version uses simulated pH until the real pH probe is available.
- For ESP32-CAM tests, network and telemetry still work, but analog pH reading should be moved to external ADC (e.g., ADS1115) when using real sensor.
- Never commit real secrets in `config.h`.
