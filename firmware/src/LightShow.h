#pragma once
#include <Arduino.h>
#include "Led.h"
#include "finale.h"

// Plays a light animation (a table of frames) on a row of LEDs without blocking.
// Call update() on every loop(); it returns right away.
class LightShow
{
public:
  LightShow(Led *leds, size_t ledCount);

  void start(const Frame *frames, size_t frameCount); // play from the first frame
  void stop();                                        // all LEDs off, go idle
  void update();                                      // move on when the time is up
  bool isPlaying() const;
  void show(uint8_t ledMask);                         // light exactly these LEDs now

private:
  Led *leds_;
  size_t ledCount_;
  const Frame *frames_ = nullptr;
  size_t frameCount_ = 0;
  size_t frameIndex_ = 0;
  bool playing_ = false;
  unsigned long frameStartMs_ = 0;

  void showFrame(size_t index);
};
