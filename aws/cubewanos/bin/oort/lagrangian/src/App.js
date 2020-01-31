import React from 'react';
import { COREID } from './config/defines.js'
import LatestReading from './components/latest_reading.js'
import './css/app.css';

var App = () => {
  return (
    <div className="App">
        <LatestReading coreid={COREID} />
    </div>
  );
}

export default App;
