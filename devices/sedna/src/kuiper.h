#ifndef _KUIPER_H_
#define _KUIPER_H_
#include "application.h"

#define S_ONE_SECOND (1)
#define S_TWO_SECONDS (2)
#define S_FIVE_SECONDS (5)
#define S_TEN_SECONDS (10)
#define S_FIFTEEN_SECONDS (15)
#define S_ONE_MINUTE (60)
#define S_TWO_MINUTES (2*60)
#define S_FIVE_MINUTES (5*60)
#define S_TEN_MINUTES (10*60)
#define S_TWELVE_MINUTES (12*60)
#define MS_HUNDRED_MILLISECONDS (100)
#define MS_FIVE_SECONDS (5*1000)
#define MS_THIRTY_SECONDS (30*1000)
#define MS_ONE_MINUTE (60*1000)
#define MS_FIVE_MINUTES (5*60*1000)
#define MS_TEN_MINUTES (10*60*1000)
#define MS_TWELVE_MINUTES (12*60*1000)
#define MS_ONE_SECOND (1000)
#define MS_TEN_SECONDS (10*1000)
#define MS_FIFTY_SECONDS (50*1000)

// convert input volage reading to kelvin; 10mV = 1K
// #define ANALOGKELVINCONVERSION (0.08056640625) // (3.3/4096)*100
// #define KELVINCELSIUSCONVERSION (-273.15)

enum StateValue {
    WAITING,
    READING,
    TRANSMITTING
};

struct config {
  uint32_t reading_interval;
};

struct state {
  StateValue state;
  uint32_t last_reading;
};

#endif