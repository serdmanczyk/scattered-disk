import { scaleLinear, scaleLog } from '@vx/scale'
import { faTint, faTemperatureHigh, faTachometerAlt,
         faSkullCrossbones, faBatteryFull } from '@fortawesome/free-solid-svg-icons'

const typeTemperature = 'temperature'
const typeHumidity = 'humidity'
const typePressure = 'pressure'
const typeVoc = 'voc'
const typeBattery = 'battery'

const attributeTypes = {
    [typeTemperature]: {
        icon: faTemperatureHigh,
        nextAttribute: typeHumidity,
        precision: 1,
        label: 'Temperature',
        unit: '°F',
        color: scaleLinear({
            domain: [66, 80],
            range: ["#bce3df", "#de6a6a"],
            clamp: true
        })
    },
    [typeHumidity]: {
        icon: faTint,
        nextAttribute: typePressure,
        precision: 0,
        label: 'Humidity',
        unit: '%',
        color: scaleLinear({
            domain: [45, 65],
            range: ["#fbfdd6", "#388194"],
            clamp: true
        })
    },
    [typePressure]: {
        icon: faTachometerAlt,
        nextAttribute: typeVoc,
        precision: 0,
        label: 'Pressure mb',
        unit: 'mb',
        color: scaleLinear({
            domain: [900, 1020],
            range: ["#81cfdc", "#f9dec8"],
            clamp: true
        })
    },
    [typeVoc]: {
        icon: faSkullCrossbones,
        nextAttribute: typeBattery,
        precision: 0,
        label: 'Volatile Oxidative Compounds',
        unit: 'kOhm',
        color: scaleLog({
            domain: [30, 60],
            range: ["#bce3df", "#f9d9c9"],
            clamp: true
        })
    },
    [typeBattery]: {
        icon: faBatteryFull,
        nextAttribute: typeTemperature,
        precision: 3,
        label: 'Voltage',
        unit: 'V',
        color: scaleLog({
            domain: [4.2, 3.2],
            range: ["#bce3df", "#de6a6a"],
            clamp: true
        })
    },
}

export {typeTemperature, typeHumidity, typePressure, typeVoc, typeBattery, attributeTypes}
