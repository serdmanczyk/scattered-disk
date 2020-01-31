#include "math.h"
#include "kuiper.h"
#include "led.h"
#include <Adafruit_Sensor.h>
#include "Adafruit_BME680.h"
#include "app_bme680.h"

SYSTEM_MODE(MANUAL);

Adafruit_BME680 bme_sensor; // I2C

struct bme680Data bme_data;
uint32_t last_reading = 0;

StateValue state = WAITING;
StateValue next_state = WAITING;

void setup() {
  setLEDStatus(&nominal);
  Serial.begin(9600);
  bool bme_init = false;
  do {
    bme_init = initBME(&bme_sensor);
    delay(500);
  } while(bme_init == false);
  bme_sensor.sleep();
}

void loop() {
  switch(state) {
    case WAITING:
      wait();
      break;
    case READING:
      read();
      break;
    case TRANSMITTING:
      transmit();
      break;
  }
}

void wait() {
  System.sleep(D2, FALLING, S_FIVE_SECONDS);
  SleepResult result = System.sleepResult();

  if (result.reason() == WAKEUP_REASON_PIN)
  {
    set_state(READING);
    return;
  }

  if (next_state != WAITING) {
    set_state(next_state);
    return;
  }

  uint32_t now = millis();
  if ((now - last_reading) > MS_TWELVE_MINUTES) {
    set_state(READING);
    return;
  }
}

void set_state(StateValue st) {
  state = st;
  next_state = st;
}

void retry_state(StateValue st) {
  state = WAITING;
  next_state = st;
}

void read() {
    if (!bme_sensor.wakeUp()) {
      setLEDStatus(&readingError);
      retry_state(READING);
      return;
    }
    if (!doBMEReading(&bme_sensor, &bme_data)) {
      setLEDStatus(&readingError);
      retry_state(READING);
      return;
    }
    bme_sensor.sleep();
    last_reading = millis();
    setLEDStatus(&tookReading);
    set_state(TRANSMITTING);
}

void format_reading(char *reading) {
  const char *readingFmt = 
    "{"
    "\"temperature\": %3.3f,"
    "\"humidity\": %3.3f,"
    "\"pressure\": %d,"
    "\"voc\": %d,"
    "\"battery\": %3.3f,"
    "\"timestamp\": \"%s\""
    "}";

  time_t time = Time.now();
   // 2004-01-10T08:22:04-05:15
  String timeStr = Time.format(time, TIME_FORMAT_ISO8601_FULL);

  float battery = analogRead(BATT) * 0.0011224;
  sprintf(reading,
          readingFmt,
          bme_data.temperature,
          bme_data.humidity,
          bme_data.pressure,
          bme_data.gas_resistance,
          battery,
          timeStr.c_str());
}

void transmit() {
  bool success = false;
  char reading[255];

  format_reading(reading);

  RGB.control(false);
  Particle.connect();
  if (!waitFor(Particle.connected, MS_THIRTY_SECONDS))
    goto done;

  Particle.publish("Reading", reading, 300, PRIVATE);
  Particle.process();
  success = true;

done:
  Particle.disconnect();
  RGB.control(true);

  if (!success)
  {
    setLEDStatus(&transmitError);
    retry_state(TRANSMITTING);
    return;
  }

  setLEDStatus(&nominal);
  set_state(WAITING);
}
