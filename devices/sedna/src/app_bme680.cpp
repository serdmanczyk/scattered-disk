#include "Adafruit_BME680.h"
#include "app_bme680.h"


bool initBME(Adafruit_BME680 *bme) {
  if (!bme->begin()) {
    Serial.println(F("Could not find a valid BME680 sensor, check wiring!"));
    return false;
  }

  // Set up oversampling and filter initialization
  bme->setTemperatureOversampling(BME680_OS_8X);
  bme->setHumidityOversampling(BME680_OS_2X);
  bme->setPressureOversampling(BME680_OS_4X);
  bme->setIIRFilterSize(BME680_FILTER_SIZE_3);
  bme->setGasHeater(320, 150); // 320*C for 150 ms
  return true;
}

bool doBMEReading(Adafruit_BME680 *bme, bme680Data *data) {
  // Tell BME680 to begin measurement.
  unsigned long endTime = bme->beginReading();
  if (endTime == 0) {
    Serial.println(F("Failed to begin reading :("));
    return false;
  }

#ifdef BME680_APP_DEBUG
  Serial.print(F("Reading started at "));
  Serial.print(millis());
  Serial.print(F(" and will finish at "));
  Serial.println(endTime);
#endif

  if (!bme->endReading()) {
    Serial.println(F("Failed to complete reading :("));
    return false;
  }

  // convert to F
  data->temperature = (bme->temperature * 1.8) + 32;
  data->humidity = bme->humidity;
  data->pressure = bme->pressure / 100.0;
  data->gas_resistance = bme->gas_resistance / 1000.0;

#ifdef BME680_APP_DEBUG
  Serial.print(bme->temperature);
  Serial.print(bme->humidity);
  Serial.print(bme->pressure / 100.0);
  Serial.print(bme->gas_resistance / 1000.0);

  Serial.print(F("Reading completed at "));
  Serial.println(millis());

  Serial.print(F("Temperature = "));
  Serial.print(data->temperature);
  Serial.println(F(" *C"));

  Serial.print(F("Pressure = "));
  Serial.print(data->pressure);
  Serial.println(F(" hPa"));

  Serial.print(F("Humidity = "));
  Serial.print(data->humidity);
  Serial.println(F(" %"));

  Serial.print(F("Gas = "));
  Serial.print(data->gas_resistance);
  Serial.println(F(" KOhms"));
#endif
  return true;
}