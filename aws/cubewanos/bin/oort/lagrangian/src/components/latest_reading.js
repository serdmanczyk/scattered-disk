import React, { useState, useEffect } from 'react';
import Modal from 'react-modal'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSnowflake } from '@fortawesome/free-solid-svg-icons'
import Time from './time'
import ReadingsView from './readings_view'
import {typeTemperature, typeHumidity, typePressure,
        typeVoc, typeBattery, attributeTypes} from '../util/attributes'
import { fetchLatestReading } from '../util/readings_store'
import { zip, sum } from 'd3-array';
import '../css/latest_reading.css';

const dev = process.env.NODE_ENV === 'development'

// const DEFAULT_READING = {
//     timestamp: "2018-04-25T10:39:00Z",
//     temperature: -434.45, // temperature-high
//     humidity: 110, // tint
//     battery: 120, // battery-full
//     pressure: 1083.8, // tachomoeter-alt
//     voc: -5, // skull-crossbones
// };
const mousePosDefault = [0, 0]
const DEFAULT_READING = {
    timestamp: "2018-04-25T10:39:00Z",
    temperature: 67, // temperature-high
    humidity: 60, // tint
    battery: 3.8, // battery-full
    pressure: 1010, // tachomoeter-alt
    voc: 20, // skull-crossbones
};

const keys = {
    ENTER: 13
}

Modal.setAppElement("#root")

function euclideanDistance(pointA, pointB) {
    const pointDist = ([a, b]) => Math.pow(a - b, 2)
    const pairs = zip(pointA, pointB)
    const diffs = pairs.map(pointDist)
    return Math.sqrt(sum(diffs))
}

function LatestReading({ coreid }) {
    const [isLoaded, setLoaded] = useState(false)
    const [reading, setReading] = useState(DEFAULT_READING)
    const [isModalOpen, setModalisOpen] = useState(dev ? true : false);
    const [isMouseMoving, setMouseMoving] = useState(false)
    const [mousePos, setMousePos] = useState(mousePosDefault)

    const movementoStarted = () => ({ clientX, clientY }) => {
        console.log([clientX, clientY], isMouseMoving)
        setMouseMoving(true)
        setMousePos([clientX, clientY])
        setTimeout(() => {
            setMouseMoving(false)
            setMousePos(mousePosDefault)
        }, 1000)
    }
    const movementoEnded = () => ({ clientX, clientY }) => {
        console.log([clientX, clientY], isMouseMoving)
        if (isMouseMoving) {
            const distance = euclideanDistance([clientX, clientY], mousePos)
            console.log([clientX, clientY], distance)
            setMouseMoving(false)
            setMousePos(mousePosDefault)
        }
    }
    const openModal = () => setModalisOpen(true)
    const closeModal = () => setModalisOpen(false)

    const keyDownThunk = () => ({ keyCode }) => {
        switch (keyCode) {
            case keys.ENTER:
                openModal()
                break;
            default:
                break;
                
        }
    }

    useEffect(() => {
        const keyListener = keyDownThunk()
        const started = movementoStarted()
        const ended = movementoEnded()
        const combos = [
            ['keyup', keyListener],
            // ['touchstart', started],
            // ['mousedown', started],
            // ['touchend', ended],
            // ['mouseup', ended]
        ]
        combos.forEach(([action, listener]) => window.addEventListener(action, listener))

        const tearDown = () => {
            combos.forEach(([action, listener]) => window.removeEventListener(action, listener))
        }

        if (process.env.NODE_ENV === 'development') {
            setReading(DEFAULT_READING)
            setLoaded(true)
            return tearDown
        }

        fetchLatestReading(coreid).then(reading => {
            setReading(reading)
            setLoaded(true)
            return tearDown
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [coreid])

    var { temperature, humidity, pressure,
          voc, battery, timestamp } = reading;
    const metric = (type) => (val, attributeType) => {
        const { precision, symbol, unit, color } = attributeTypes[attributeType]
        return (
            <div className={type}>
                <span style={{color: color(val)}}>
                    {val.toFixed(precision)} {unit}
                </span>
            </div>
        )
    }
    const mainReading = metric("MainReading")
    const subReading = metric("SubReading")
    
    if (!isLoaded) {
        return (
            <div className="Top-Container">
                <FontAwesomeIcon
                    icon={faSnowflake}
                    className="fa-spin"
                    size='10x'/>
            </div>
        );
    }

    return (
        <div className="Top-Container">
            <Modal
                isOpen={isModalOpen}
                className="Modal"
                overlayClassName="Overlay">
                <ReadingsView {...{ coreid, closeModal }} />
            </Modal>
            <div className="Stats-Container"
                onClick={openModal}
            >
                <div className="Reading-Container">
                    {mainReading(temperature, typeTemperature)}
                    <div className="SubReading-Container">
                        {subReading(humidity, typeHumidity)}
                        {subReading(pressure, typePressure)}
                        {subReading(voc, typeVoc)}
                        {subReading(battery, typeBattery)}
                    </div>
                </div>
            </div>
            <Time {...{ timestamp }} />
        </div>
    );    
}


export default LatestReading;
