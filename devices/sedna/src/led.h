
void setLEDStatus(LEDStatus *status);

LEDStatus nominal(RGB_COLOR_GRAY);
LEDStatus readingError(RGB_COLOR_ORANGE);
LEDStatus tookReading(RGB_COLOR_GREEN);
LEDStatus transmitError(RGB_COLOR_RED);


void setLEDStatus(LEDStatus *status)
{
  status->setActive();
}
