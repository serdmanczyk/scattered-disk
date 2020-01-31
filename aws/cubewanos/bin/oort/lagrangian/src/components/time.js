import React, { useState, useEffect } from 'react';
import moment from 'moment'

const DEFAULT_TIME = "2018-04-25T10:39:00Z"

function Time({ timestamp }) {
    const diff = (s) => moment(s).fromNow()
    const [elapsed, setElapsed] = useState(diff(DEFAULT_TIME))

    useEffect(() => {
        const updort = () => setElapsed(diff(timestamp))
        updort()
        const id = setInterval(updort, 1000)
        return () => clearInterval(id)
    }, [timestamp])
    
    return (
    <div className="Time">
        {elapsed}
    </div>
    );
}

export default Time
