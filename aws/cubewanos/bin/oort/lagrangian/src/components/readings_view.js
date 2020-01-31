import React, { useState, useEffect } from 'react'
import moment from 'moment'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft, faChevronRight, faRedo,
    faTimesCircle, faTrash, faSnowflake, faHourglass,
    faCalendarDay, faCalendarWeek, faSnowman } from '@fortawesome/free-solid-svg-icons'
import { withParentSize } from '@vx/responsive';
import { scaleTime, scaleLinear } from '@vx/scale'
import { LinePath, Bar, Line } from '@vx/shape';
import { Group } from '@vx/group';
import { curveMonotoneX } from '@vx/curve'
import { extent, maxIndex, minIndex, bisector } from 'd3-array';
import { withTooltip, Tooltip } from '@vx/tooltip';
import { localPoint } from '@vx/event';
import {typeTemperature, typeHumidity, typePressure,
        typeVoc, typeBattery, attributeTypes} from '../util/attributes'
import { fetchReadings, clear } from '../util/readings_store'
import '../css/modal.css';
import '../css/chart.css';

const TIME_LOADED = moment().unix()
const WACKY_TIME = 1577300095
const keys = {
    LEFT: 37,
    RIGHT:39,
    DOWN: 40,
    A: 65,
    ESC: 27
}
const dev = process.env.NODE_ENV === 'development'

// function summarize(attribute, readings, precision) {
//     const values = readings
//         .map((r) => r[attribute])
//         .sort()

//     console.log(scaleSequentialQuantile().domain(values).quantiles(4))
//     // const qs = [0, 0.25, 0.5, 0.75, 1]
//     const [min, q1, median, q3, max] = scaleSequentialQuantile().domain(values).quantiles(4)
//         // .map((q) => quantile(values, q))
//         .map((num) => (num ? num : 0).toFixed(precision))
        
//     return {min, q1, median, q3, max}
// }


// function showReading({min, q1, median, q3, max}) {
//     return <span>{min} {q1} {median} {q3} {max}</span>
// }

// function numTicksForWidth(width) {
//     if (width <= 300) return 2;
//     if (300 < width && width <= 400) return 5;
//     return 10;
//   }

function calcMidnights(start, end) {
    let midnights = []
    let curr = moment(start).endOf('day').add(1, 'ms')
    while (curr < end) {
        midnights.push(curr)
        curr = moment(curr).add(1, 'day')
    }
    return midnights
}

function chopped(readings) {
    const oneHour = 60 * 60
    let chunks = []
    const stmp = (r) => moment(r.timestamp).unix()
    const first = readings[0]
    let lastStamp = stmp(first)
    let curChunk = [first]

    readings.slice(1).forEach(r => {
        const timestamp = stmp(r)
        if ((timestamp - lastStamp) > oneHour) {
            chunks.push(curChunk)
            curChunk = []
        }

        lastStamp = timestamp
        curChunk.push(r)
    })
    chunks.push(curChunk)

    return chunks
}

// laziness: https://stackoverflow.com/a/15453499/2406040
function range(start, stop, step) {
    var a = [start], b = start;
    while (b < stop) {
        a.push(b += step || 1);
    }
    return a;
}

class Chart extends React.Component {
    constructor(props) {
        super(props);
        this.handleTooltip = this.handleTooltip.bind(this);
    }
    handleTooltip({ event, xScale, yScale, readings, attributeType }) {
        const { showTooltip, hideTooltip } = this.props
        const { x } = localPoint(event);
        const x0 = xScale.invert(x)
        const toDate = (r) => moment(r).toDate()
        const index = bisector(r => toDate(r.timestamp)).left(readings, x0, 1)
        const d0 = readings[index - 1];
        const d1 = readings[index];
        let d = d0;
        if (d1 && d1.timestamp) {
          d = x0 - toDate(d0.timestamp) > toDate(d1.timestamp) - x0 ? d1 : d0;
        }
        
        const indexDelta = Math.abs(x0 - toDate(d.timestamp))
        const oneHour = 60 * 60 * 1000
        if (indexDelta > oneHour) {
            hideTooltip()
            return
        }

        const readingValue = d[attributeType]
        const xPos = xScale(toDate(d.timestamp))
        const yPos = yScale(readingValue)
        // console.log(x, x0, index, d0.timestamp, d1 ? d1.timestamp: null, d.timestamp)
        showTooltip({
            tooltipData: d,
            tooltipLeft: x,
            tooltipTop: yPos
        })
    }

    render() {
        const { parentWidth, parentHeight,
                readings, start, end, attributeType,
                showTooltip, hideTooltip, tooltipOpen,
                tooltipLeft, tooltipTop, tooltipData, updateTooltip } = this.props
        
        const x = r => moment(r.timestamp).toDate()
        const y = r => r[attributeType]
        const [width, height] = [parentWidth, parentHeight]
        const padding = {top: 20, left: 30, right: 30, bottom: 20}
        const xMin = padding.left
        const xMax = width - padding.right - padding.left
        const yMin = padding.top
        const yMax = height - padding.top - padding.bottom

        const midnights = calcMidnights(start, end)

        if (!readings.length) {
            return <FontAwesomeIcon icon={faSnowman} className="fa-rotate-90" size='5x'/>
        }
        const maxReading = readings[maxIndex(readings, y)]
        const minReading = readings[minIndex(readings, y)]

        const xScale = scaleTime({
            domain: [start.toDate(), end.toDate()],
            range: [xMin, xMax],
        })

        const buffer = (y(maxReading) - y(minReading)) / 10
        const [dStart, dEnd] = extent(readings, y)
        const yScale = scaleLinear({
            domain: [dStart - buffer, dEnd + buffer],
            range: [yMax, yMin],
        })

        const colorScale = attributeTypes[attributeType].color

        // Battery dies, chip gets unplugged, lost wireless, all kinds of weird things.
        // A single line looks weird when it connects over large gaps in time so
        // split it into multiple lines.
        const pieces = chopped(readings)

        const gradients = pieces.map((piece, i) => {
            // Scale mapping yVal to 'percentage' of line in regards to y
            const stopScale = scaleLinear({
                domain: extent(piece, y),
                range: [100, 0],
            })

            return range(0, 100, 10).map(perc => {
                const yVal = stopScale.invert(perc)
                const color = colorScale(yVal)
                return { yVal, perc, color }
            })
        })

        const circle = (reading) => {
            return (
                <circle
                    // className="ChartCircle"
                    cx={xScale(x(reading))}
                    cy={yScale(y(reading))}
                    r={4}
                    strokeWidth={1}
                    fill={colorScale(y(reading))}
                    style={{ pointerEvents: 'none' }}
                />
            )
        }

        const text = (reading) => {
            return (
                <text
                    className="ChartText"
                    y={yScale(y(reading)) + 12}
                    x={xScale(x(reading)) + 12}
                    fill={colorScale(y(reading))}
                >
                    {y(reading)}
                </text>
            )
        }

        const tooltipHandler = (event) => this.handleTooltip({
            event,
            xScale,
            yScale,
            readings,
            attributeType
        })

        const verticalLine = (x, color, key) => {
            return (
                <Line
                    key={key}
                    from={{ x: x, y: 0 }}
                    to={{ x: x, y: yMax }}
                    stroke={color}
                    strokeWidth={2}
                    style={{ pointerEvents: 'none' }}
                    strokeDasharray="2,2"
                />
            )
        }

        // console.log(tooltipLeft, tooltipTop, tooltipData ? moment(tooltipData.timestamp): null)
        return (
            <div>
                <svg width={width} height={height}>
                    <defs>
                        {gradients.map((stops, i) => {
                            const key = `gradient-${i}`
                            return (
                                <linearGradient key={key} id={key} x1="0%" y1="0%" x2="0%" y2="100%">
                                    {stops.map(({perc, color}) => {
                                        return <stop key={`${key}-${perc}`} offset={perc.toFixed(2) + "%"} stopColor={color} stopOpacity={1} />
                                    })}
                                </linearGradient>
                            )
                        })}
                    </defs>
                    
                    {midnights.map(midnight => {
                        const x = xScale(midnight.toDate())
                        return verticalLine(x, "#1e3e3a", x)
                    })}
                    {pieces.map((piece, i) => {
                        return (
                            <Group key={`pieces-${i}`}>
                                <LinePath
                                    className="ChartLine"
                                    data={piece}
                                    x={d => xScale(x(d))}
                                    y={d => yScale(y(d))}
                                    stroke={`url(#gradient-${i})`}
                                    strokeWidth={3}
                                    curve={curveMonotoneX}
                                />
                            </Group>
                        )
                    })}

                    {circle(maxReading)}
                    {text(maxReading)}
                    {circle(minReading)}
                    {text(minReading)}

                    {tooltipData && (
                        <g>
                            {verticalLine(xScale(x(tooltipData)), colorScale(y(tooltipData)), "")}
                            {circle(tooltipData)}
                        </g>
                    )}
                    <Bar x={0} y={0} rx={14}
                        width={width} height={height}
                        fill="transparent"
                        data={readings}
                        onTouchStart={tooltipHandler}
                        onTouchMove={tooltipHandler}
                        onMouseMove={tooltipHandler}
                        onMouseLeave={event => hideTooltip()}
                    />
                </svg>

                {tooltipData && (
                        <div>
                            <Tooltip
                                top={tooltipTop - 12}
                                left={tooltipLeft + 12}
                                className="Tooltip"
                                style={{
                                    backgroundColor: "#1e3e3a",
                                    color: colorScale(tooltipData[attributeType])
                                }}
                                >
                                {tooltipData[attributeType]}
                            </Tooltip>
                            <Tooltip
                                top={yMax-12}
                                left={tooltipLeft-35}
                                style={{
                                    backgroundColor: "#1e3e3a",
                                    color: "#88d3df"
                                }}
                                >
                                {moment(tooltipData.timestamp).format("MMM Do h:mmA")}
                            </Tooltip>
                        </div>
                    )}
                {/* <p>{showReading(summarize(attributeType, readings, attributeTypes[attributeType].precision))}</p> */}
            </div>
        )
    }
}
Chart = withTooltip(withParentSize(Chart))

const keyDownThunk = (controls) => ({ keyCode }) => {
    switch (keyCode) {
        case keys.RIGHT:
            controls.advance()
            break;
        case keys.LEFT:
            controls.retreat()
            break;
        case keys.DOWN:
            controls.cycleType()
            break;
        case keys.A:
            controls.cycleAttribute()
            break;
        case keys.ESC:
            controls.closeModal()
            break;
        default:
            break;
            
    }
}

function ReadingsView({ coreid, closeModal }) {
    const [refTime, setRefTime] = useState(dev ? WACKY_TIME : TIME_LOADED)
    const [viewType, setViewType] = useState(dev ? TYPE_WEEK : TYPE_HOURS)
    const [attributeType, setAttributeType] = useState(dev ? typeHumidity : typeTemperature)
    const [readings, setReadings] = useState([])
    const [isLoading, setloading] = useState(false)
    const [start, end] = VIEW_TYPES[viewType].startEnd(moment.unix(refTime))

    // In relation to moving the time span forwards and backwards
    const advance = () =>  {
        const advanceFunc = VIEW_TYPES[viewType].add
        const newRef = advanceTime(refTime, TIME_LOADED, advanceFunc)
        setRefTime(newRef)
    }
    const retreat = () => {
        const retreatFunc = VIEW_TYPES[viewType].sub
        const newRef = retreatTime(refTime, retreatFunc)
        setRefTime(newRef)
    }
    const reset = () => setRefTime(TIME_LOADED)
    // -----

    // In relation to modifying reading type and time span
    const cycleAttribute = () => {
        setAttributeType(attributeTypes[attributeType].nextAttribute)
    }

    const cycleType = () => {
        setViewType(VIEW_TYPES[viewType].nextType)
    }
    // -----

    useEffect(() => {
        const now = moment.unix(TIME_LOADED)
        const cappedEnd = end > now ? now : end
        const timeoutId = setTimeout(() => {setloading(true)}, 500)
        fetchReadings(coreid, start.unix(), cappedEnd.unix())
            .then(readings => {
                clearTimeout(timeoutId)
                setReadings(readings)
                setloading(false)
            })
        
        const listener = keyDownThunk({ cycleType, cycleAttribute, reset, retreat, advance, closeModal })
        window.addEventListener('keyup', listener)
        return () => {
            window.removeEventListener('keyup', listener)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [coreid, refTime, viewType, attributeType])

    const loadingIcon = <FontAwesomeIcon icon={faSnowflake} className="fa-spin" size='5x'/>

    const title = (s) => s[0].toUpperCase() + s.slice(1)

    const content = () => {
        // console.log(parent)
        return (
            <div className="ModalContentRows">
                <div className="Meta">
                    <div className = "MetaWords">
                        {title(attributeType)}
                    </div>
                    <div className = "MetaWords">
                        {VIEW_TYPES[viewType].display(start, end)}
                    </div>
                </div>
                <div className="ChartContainer">
                    <div className="ChartItem">
                        <Chart readings={readings} start={start} end={end} attributeType={attributeType}/>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="ModalApp">
            <div className="ModalRows">
                <div className="ModalNav">
                    <button className="Viewbutton" onClick={cycleAttribute}><FontAwesomeIcon icon={attributeTypes[attributeType].icon} /></button>
                    <button className="Viewbutton" onClick={cycleType}><FontAwesomeIcon icon={VIEW_TYPES[viewType].icon} /></button>
                    <button className="Viewbutton" onClick={retreat}><FontAwesomeIcon icon={faChevronLeft} /></button>
                    <button className="Viewbutton" onClick={advance}><FontAwesomeIcon icon={faChevronRight} /></button>
                    <button className="Viewbutton" onClick={reset}><FontAwesomeIcon icon={faRedo} /></button>
                    <button className="Viewbutton" onClick={clear}><FontAwesomeIcon icon={faTrash}/></button>
                    <button className="Viewbutton" onClick={closeModal}><FontAwesomeIcon icon={faTimesCircle}/></button>
                </div>
                <div className="ModalContent">
                    {isLoading ?  loadingIcon : content()}
                </div>
            </div>
        </div>
    )
}

const TYPE_HOURS = "hours" // hourglass
const TYPE_DAY = "days" // calendar-day
const TYPE_WEEK = "weeks" // calendar-week

const VIEW_TYPES = {
    [TYPE_HOURS]: {
        startEnd(ref) {
            const start = moment(ref).subtract(5, TYPE_HOURS)
            return [start, ref]
        },
        sub: (ref) => moment(ref).subtract(5, TYPE_HOURS),
        add: (ref) => moment(ref).add(5, TYPE_HOURS),
        display(start, end) {
            const sameDay = start.date() === end.date()
            if (!sameDay) {
                const startRepr = start.format("ddd, MMM Do hA")
                const endRepr = end.format("ddd, MMM Do hA")
                return `${startRepr} to ${endRepr}`
            }

            const startAM = (start.hours() < 12)
            const endAM = (end.hours() < 12)
            const samePart = startAM ? endAM : !endAM
            const startHourRepr = samePart ? 'h' : 'hA'
            const startRepr = start.format(`ddd, MMM Do ${startHourRepr}`)
            const endRepr = end.format("hA")
            return `${startRepr}-${endRepr}`
        },
        nextType: TYPE_DAY,
        icon: faHourglass
    },
    [TYPE_DAY]: {
        startEnd(ref) {
            const start = moment(ref).startOf(TYPE_DAY)
            const end = moment(ref).endOf(TYPE_DAY)
            return [start, end]
        },
        sub: (ref) => moment(ref).subtract(1, TYPE_DAY),
        add: (ref) => moment(ref).add(1, TYPE_DAY),
        display(start, end) {
            return start.format('ddd, MMM Do')
        },
        nextType: TYPE_WEEK,
        icon: faCalendarDay
    },
    [TYPE_WEEK]: {
        startEnd: (ref) => {
            const start = moment(ref).startOf(TYPE_WEEK)
            const end = moment(ref).endOf(TYPE_WEEK)
            return [start, end]
        },
        sub: (ref) => moment(ref).subtract(1, TYPE_WEEK),
        add: (ref) => moment(ref).add(1, TYPE_WEEK),
        display(start, end) {
            const sameMonth = start.month() === end.month()
            if (!sameMonth) {
                const startRepr = start.format("MMM Do")
                const endRepr = end.format("MMM Do")
                return `${startRepr} to ${endRepr}`
            }

            const startRepr = start.format("MMM D")
            const endRepr = end.format("Do")
            return `${startRepr}-${endRepr}`
        },
        nextType: TYPE_HOURS,
        icon: faCalendarWeek
    },
}

function advanceTime(refTime, loadTime, func) {
    const refMoment = moment.unix(refTime)
    const loadMoment = moment.unix(loadTime)
    const calculated = func(refMoment)
    if (calculated > loadMoment) {
        return loadMoment.unix()
    }

    return calculated.unix()
}

function retreatTime(refTime, func) {
    const refMoment = moment.unix(refTime)
    return func(refMoment).unix()
}

export default ReadingsView
