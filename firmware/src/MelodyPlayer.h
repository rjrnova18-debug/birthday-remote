#pragma once
#include <Arduino.h>
#include "melody.h"

// Plays a melody on a buzzer without blocking.
// Call update() on every loop(); it returns right away.
class MelodyPlayer
{
public:
	MelodyPlayer(uint8_t buzzerPin);

	void begin();																		 // call once from setup()
	void start(const Note *notes, size_t noteCount); // play from the first note
	void stop();																		 // silence and go idle
	void update();																	 // move on when the time is up
	bool isPlaying() const;

private:
	enum class State
	{
		Idle,
		Sounding,
		Gap
	};

	static constexpr uint16_t GAP_MS = 30; // silence between notes

	uint8_t buzzerPin_;
	const Note *notes_ = nullptr;		 // the song (points to the table, no copy)
	size_t noteCount_ = 0;					 // how many notes it has
	size_t noteIndex_ = 0;					 // which note is playing now
	State state_ = State::Idle;			 // which state the machine is in
	unsigned long stateStartMs_ = 0; // when the current state began

	void playNote(size_t index); // private helper
};