#include "Adafruit_BME680.h"

#define SEALEVELPRESSURE_HPA (1013.25)

#define BME680_APP_DEBUG

struct bme680Data {
  float temperature, humidity;
  uint32_t pressure, gas_resistance;
};

bool initBME(Adafruit_BME680 *bme);
bool doBMEReading(Adafruit_BME680 *bme, bme680Data *data);
