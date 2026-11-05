#include "LightShow.h"

LightShow::LightShow(Led *leds, size_t ledCount) : leds_(leds), ledCount_(ledCount) {}

void LightShow::start(const Frame *frames, size_t frameCount)
{
  frames_ = frames;
  frameCount_ = frameCount;
  playing_ = true;
  showFrame(0);
}

void LightShow::stop()
{
  playing_ = false;
  show(NO_LEDS);
}

void LightShow::update()
{
  if (!playing_)
  {
    return;
  }
  if (millis() - frameStartMs_ < frames_[frameIndex_].durationMs)
  {
    return;
  }

  if (frameIndex_ + 1 < frameCount_)
  {
    showFrame(frameIndex_ + 1);
  }
  else
  {
    stop();
  }
}

bool LightShow::isPlaying() const
{
  return playing_;
}

void LightShow::show(uint8_t ledMask)
{
  for (size_t i = 0; i < ledCount_; i++)
  {
    if (ledMask & (1 << i))
    {
      leds_[i].turnOn();
    }
    else
    {
      leds_[i].turnOff();
    }
  }
}

void LightShow::showFrame(size_t index)
{
  frameIndex_ = index;
  show(frames_[index].ledMask);
  frameStartMs_ = millis();
}
