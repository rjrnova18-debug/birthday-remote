#include "MelodyPlayer.h"

MelodyPlayer::MelodyPlayer(uint8_t buzzerPin) : buzzerPin_(buzzerPin) {}

void MelodyPlayer::begin()
{
  pinMode(buzzerPin_, OUTPUT);
  stop();
}

void MelodyPlayer::start(const Note *notes, size_t noteCount)
{
  notes_ = notes;
  noteCount_ = noteCount;
  playNote(0);
}

void MelodyPlayer::stop()
{
  if (isPlaying())
  {
    noTone(buzzerPin_);
  }
  state_ = State::Idle;
}

bool MelodyPlayer::isPlaying() const
{
  return state_ != State::Idle;
}

void MelodyPlayer::update()
{
  unsigned long elapsed = millis() - stateStartMs_;

  switch (state_)
  {
  case State::Idle:
    break; // nothing to advance: only start() wakes the player up

  case State::Sounding:
    if (elapsed >= notes_[noteIndex_].durationMs - GAP_MS)
    {
      noTone(buzzerPin_);
      stateStartMs_ = millis();
      state_ = State::Gap;
    }
    break;

  case State::Gap:

    if (elapsed >= GAP_MS)
    {
      if (noteIndex_ + 1 < noteCount_)
      {
        playNote(noteIndex_ + 1);
      }
      else
      {
        stop();
      }
    }
    break;
  }
}

void MelodyPlayer::playNote(size_t index)
{
  noteIndex_ = index;
  tone(buzzerPin_, notes_[noteIndex_].frequencyHz);
  state_ = State::Sounding;
  stateStartMs_ = millis();
}