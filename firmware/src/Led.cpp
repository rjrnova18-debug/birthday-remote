#include "Led.h"

Led::Led(uint8_t pin) : pin_(pin) {}

void Led::begin()
{
	pinMode(pin_, OUTPUT);
	turnOff(); // start in a known state: data and pin agree
}

void Led::turnOn()
{
	isOn_ = true;
	digitalWrite(pin_, HIGH);
}

void Led::turnOff()
{
	isOn_ = false;
	digitalWrite(pin_, LOW);
}

bool Led::isOn() const
{
	return isOn_;
}
