import './App.css';
import axios from "axios";
import {useEffect, useState} from "react";

const url = "http://sauna.local:8001/";
//const url = "http://localhost:8001/";

function App() {
  const initialStatus = {
    "currentTemp": 22.8,
    "targetTemp": 25,
    "isWorking": false,
    "isOn": false,
    "isLightEnabled": false,
    "isColorEnabled": false,
    "panelsEnabled": [
      true,
      true,
      true,
      true,
      true
    ],
    "timer": 1800
  };

  const [status, setStatus] = useState(initialStatus);

  useEffect(() => {
    const id = setInterval(async () => {
      const response = await axios.get(url + 'status');
      setStatus(response.data)
    }, 3000)
    return () => clearInterval(id)
  })

  async function toggle(switchNr) {
    const response = await axios.get(url + 'set/', {params: {switchNr, enable: !status.panelsEnabled[switchNr] ? "on" : "off"}})
    setStatus(response.data)
  }

  async function togglePower() {
    const response = await axios.get(`${url}power/${!status.isOn ? 'on' : 'off'}`);
    setStatus(response.data)
  }

  async function toggleLight() {
    const response = await axios.get(`${url}light/${!status.isLightEnabled ? 'on' : 'off'}`);
    setStatus(response.data)
  }

  async function toggleColor() {
    const response = await axios.get(`${url}color/${!status.isColorEnabled ? 'on' : 'off'}`);
    setStatus(response.data)
  }

  async function setTarget(targetTemp) {
    console.log({targetTemp})
    const response = await axios.get(`${url}target`, {params: {targetTemp}});
    setStatus(response.data)
  }

  return (
    <div className="App">
      <header className="App-header">
        <div>
          Power:
          <input type={"checkbox"} checked={status.isOn} onChange={togglePower}/>
        </div>
        <div>
          Light:
          <input type={"checkbox"} checked={status.isLightEnabled} onChange={toggleLight}/>
        </div>
        <div>
          Color:
          <input type={"checkbox"} checked={status.isColorEnabled} onChange={toggleColor}/>
        </div>
        <div>
          Heating: {status.isWorking ? "yes" : "no"}
        </div>
        <div>
          Timer: {Math.floor(status.timer / 60) + ":" + status.timer % 60} remaining
        </div>
        <div>
          Target temp: {status.targetTemp}
          <button onClick={() => setTarget(status.targetTemp + 5)}>+</button>
          <button onClick={() => setTarget(status.targetTemp - 5)}>-</button>
        </div>
        <CurrentTemp temp={status.currentTemp} />
        <br />
        <label>
          <input type={"checkbox"} checked={status.panelsEnabled[0]} onChange={() => toggle(0 )}/>
          Links voor
        </label>
        <label>
          <input type={"checkbox"} checked={status.panelsEnabled[1]} onChange={() => toggle(1 )}/>
          Rechts voor
        </label>
        <label>
          <input type={"checkbox"} checked={status.panelsEnabled[2]} onChange={() => toggle(2 )}/>
          Links achter
        </label>
        <label>
          <input type={"checkbox"} checked={status.panelsEnabled[3]} onChange={() => toggle(3 )}/>
          Rechts achter
        </label>
        <label>
          <input type={"checkbox"} checked={status.panelsEnabled[4]} onChange={() => toggle(4 )}/>
          Onder
        </label>
      </header>
    </div>
  );
}

function CurrentTemp(props) {
  return <div>
    Current: {props.temp || "-"}
  </div>
}

export default App;
