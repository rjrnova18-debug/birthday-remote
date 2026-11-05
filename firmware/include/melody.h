#pragma once
#include <Arduino.h>

// One note of a song: a pitch held for some time.
struct Note
{
    uint16_t frequencyHz;
    uint16_t durationMs;
};

// Pitches used by the song (Hz).
constexpr uint16_t NOTE_G4 = 392;
constexpr uint16_t NOTE_A4 = 440;
constexpr uint16_t NOTE_B4 = 494;
constexpr uint16_t NOTE_C5 = 523;
constexpr uint16_t NOTE_D5 = 587;
constexpr uint16_t NOTE_E5 = 659;
constexpr uint16_t NOTE_F5 = 698;
constexpr uint16_t NOTE_G5 = 784;

// Durations (ms). Change QUARTER to play the whole song faster or slower.
constexpr uint16_t QUARTER = 450;
constexpr uint16_t SIXTEENTH = QUARTER / 4;
constexpr uint16_t DOTTED_EIGHTH = QUARTER * 3 / 4;
constexpr uint16_t HALF = QUARTER * 2;
constexpr uint16_t DOTTED_HALF = QUARTER * 3;

constexpr Note HAPPY_BIRTHDAY[] = {
    {NOTE_G4, DOTTED_EIGHTH},
    {NOTE_G4, SIXTEENTH},
    {NOTE_A4, QUARTER},
    {NOTE_G4, QUARTER},
    {NOTE_C5, QUARTER},
    {NOTE_B4, HALF},

    {NOTE_G4, DOTTED_EIGHTH},
    {NOTE_G4, SIXTEENTH},
    {NOTE_A4, QUARTER},
    {NOTE_G4, QUARTER},
    {NOTE_D5, QUARTER},
    {NOTE_C5, HALF},

    {NOTE_G4, DOTTED_EIGHTH},
    {NOTE_G4, SIXTEENTH},
    {NOTE_G5, QUARTER},
    {NOTE_E5, QUARTER},
    {NOTE_C5, QUARTER},
    {NOTE_B4, QUARTER},
    {NOTE_A4, HALF},

    {NOTE_F5, DOTTED_EIGHTH},
    {NOTE_F5, SIXTEENTH},
    {NOTE_E5, QUARTER},
    {NOTE_C5, QUARTER},
    {NOTE_D5, QUARTER},
    {NOTE_C5, DOTTED_HALF},
};

constexpr size_t HAPPY_BIRTHDAY_LENGTH = sizeof(HAPPY_BIRTHDAY) / sizeof(HAPPY_BIRTHDAY[0]);
