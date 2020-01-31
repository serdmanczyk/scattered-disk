import Dexie from 'dexie';
import { API_DOMAIN } from '../config/defines.js';
import moment from 'moment'
import * as d3 from 'd3'

const DB_NAME = 'readings';
const READINGS_KEY = '[coreid+timestamp]'
const TEMPERATURE_SENTINEL = -434.45
const TWELVE_MINUTES = (60*12)
var readingsDB = new Dexie(DB_NAME);
const dev = process.env.NODE_ENV === 'development'

readingsDB.version(1).stores({
    readings: READINGS_KEY
});

async function query(path, params) {
    return fetch(`https://${API_DOMAIN}/${path}${params}`)
}

async function fetchLatestReading(coreid) {
    const result = await query('latest_reading', `?coreid=${coreid}`)
    if (result.status !== 200) {
        return {}
    }
    
    return result.json()
}

async function fetchReadingsAPI(coreid, startTime, endTime) {
    const params = `?coreid=${coreid}&startTime=${startTime}&endTime=${endTime}`
    const result = await query('readings', params)
    if (result.status !== 200) {
        return []
    }

    const res = await result.json()
    console.log('fetched', res)
    return res
}

async function fetchMissingAPI(coreid, requested, inDB) {
    const spans = calcMissingSpans(requested, inDB)
    let missingReadings = []
    const promises = spans.map(async (span) => {
        const [start, end] = span
        const readings = await fetchReadingsAPI(coreid, start, end)
        missingReadings.push(...readings)
    })
    await Promise.all(promises)
    return missingReadings
}

function calcMissingSpans(requested, inDB) {
    const [reqStart, reqEnd] = requested
    const [dbStart, dbEnd] = inDB

    let missingSpans = []
    if ((dbStart - reqStart) > TWELVE_MINUTES) {
        missingSpans.push([reqStart, dbStart])
    }

    if ((reqEnd - dbEnd) >  TWELVE_MINUTES) {
        missingSpans.push([dbEnd, reqEnd])
    }

    const format_stamp = (stmp) => moment.unix(stmp).utc().format()
    const format_spans = (spans) => spans.map(format_stamp)
    console.log('missing', requested.map(format_stamp), missingSpans.map(format_spans))
    return missingSpans
}

function readingsExtent(readings) {
    const extent = d3.extent(readings, (reading) => {
        return moment(reading.timestamp).unix()
    })
    return extent
}

function sentinelGen(coreid) {
    return (posixTimestamp) => {
        return {
            timestamp: moment.unix(posixTimestamp).utc().format(),
            coreid: coreid,
            temperature: TEMPERATURE_SENTINEL
        }
    }
}

function readingsProper(readings) {
    return readings
        .filter((reading) => {
            return reading.temperature !== TEMPERATURE_SENTINEL
        })
        .sort((reading) => reading.timestamp)
}

function calcSentinels(readings, coreid, startTime, endTime) {
    const genSentinel = sentinelGen(coreid)
    const [start, end] = readingsExtent(readings)
    let sentinels = []
    if ((start - startTime) > TWELVE_MINUTES) {
        sentinels.push(genSentinel(startTime))
    }
    if ((endTime - end) > TWELVE_MINUTES) {
        sentinels.push(genSentinel(endTime))
    }
    return sentinels
}

async function fetchReadings(coreid, startTime, endTime) {
    const dbReadings = await fetchReadingsDB(coreid, startTime, endTime)
    if (dev) {
        return readingsProper(dbReadings)
    }
    if (dbReadings.length) {
        console.log('db', dbReadings)
        const requested = [startTime, endTime]
        const inDB = readingsExtent(dbReadings)
        const missingReadings = await fetchMissingAPI(coreid, requested, inDB)
        const allReadings = dbReadings.concat(missingReadings)
        const sentinels = calcSentinels(allReadings, coreid, startTime, endTime)
        if (sentinels.length) {
            missingReadings.push(...sentinels)
        }
        if (missingReadings.length) {
            await putReadingsDB(missingReadings)
        }
        dbReadings.push(...missingReadings)
        return readingsProper(dbReadings)
    }
    const apiReadings = await fetchReadingsAPI(coreid, startTime, endTime)
    const sentinels = calcSentinels(apiReadings, coreid, startTime, endTime)
    if (sentinels.length) {
        await putReadingsDB(sentinels)
    }
    await putReadingsDB(apiReadings)
    return readingsProper(apiReadings)
}

async function putReadingsDB(readings) {
    return readingsDB.readings
        .bulkPut(readings)
        .catch((error) => {
            console.log('put error', error)
        })
}

async function fetchReadingsDB(coreid, startTime, endTime) {
    const format = (s) => moment.unix(s).utc().format() //2019-12-19T02:28:56Z
    const [start, end] = [startTime, endTime].map(format)
    // const [start, end] = [moment.unix(0).utc().format(), moment().add(1, 'year').utc().format()]
    return readingsDB.readings
        .where(READINGS_KEY)
        .between([coreid, start], [coreid, end], true, true)
        .toArray()
        .catch((error) => {
            console.log('fetch error', error)
            return []
        })
}

function clear() {
    readingsDB.readings.clear()
}

export { fetchReadings, fetchLatestReading, clear };
