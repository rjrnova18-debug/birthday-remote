#pragma once
#include <Arduino.h>

// One step of a light animation: which LEDs are on and for how long.
// Bit 0 is the first LED (yellow), bit 3 the last one (blue).
struct Frame
{
  uint8_t ledMask;
  uint16_t durationMs;
};

constexpr uint8_t ALL_LEDS = 0b1111;
constexpr uint8_t NO_LEDS = 0b0000;
constexpr uint16_t BLINK_MS = 150;
constexpr uint16_t WAVE_STEP_MS = 100;
constexpr uint16_t HOLD_MS = 800;

// Three blinks, a wave from left to right, and all on to close.
constexpr Frame FINALE[] = {
    {ALL_LEDS, BLINK_MS}, {NO_LEDS, BLINK_MS},
    {ALL_LEDS, BLINK_MS}, {NO_LEDS, BLINK_MS},
    {ALL_LEDS, BLINK_MS}, {NO_LEDS, BLINK_MS},
    {0b0001, WAVE_STEP_MS}, {0b0010, WAVE_STEP_MS}, {0b0100, WAVE_STEP_MS}, {0b1000, WAVE_STEP_MS},
    {ALL_LEDS, HOLD_MS},
};
constexpr size_t FINALE_LENGTH = sizeof(FINALE) / sizeof(FINALE[0]);
