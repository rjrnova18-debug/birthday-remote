#pragma once
#include <Arduino.h>

// One LED on a GPIO pin. It always knows whether it is on.
class Led
{
public:
	Led(uint8_t pin); // constructor: only remembers the pin
	void begin();			// configures the pin; call it from setup()
	void turnOn();
	void turnOff();
	bool isOn() const; // lets others READ the state, not change it

private:
	uint8_t pin_;
	bool isOn_ = false;
};