import logo from './logo.svg';
import './App.css';
import axios from "axios";
import {useEffect, useState} from "react";

const url = "http://sauna.local:8001/";

function App() {
  const [panelStatus, setPanelStatus] = useState([true, true, true, true, true]);

  async function toggle(switchNr) {
    const newStatus = [...panelStatus];
    newStatus[switchNr] = !newStatus[switchNr];
    setPanelStatus(newStatus);
    console.log(switchNr, newStatus[switchNr])
    await axios.get(url + 'set/', {params: {switchNr, enable: newStatus[switchNr] ? "1" : "0"}})
  }


  return (
    <div className="App">
      <header className="App-header">
        <CurrentTemp />
        <label>
          <input type={"checkbox"} checked={panelStatus[0]} onChange={() => toggle(0 )}/>
          Links voor
        </label>
        <label>
          <input type={"checkbox"} checked={panelStatus[1]} onChange={() => toggle(1 )}/>
          Rechts voor
        </label>
        <label>
          <input type={"checkbox"} checked={panelStatus[2]} onChange={() => toggle(2 )}/>
          Links achter
        </label>
        <label>
          <input type={"checkbox"} checked={panelStatus[3]} onChange={() => toggle(3 )}/>
          Rechts achter
        </label>
        <label>
          <input type={"checkbox"} checked={panelStatus[4]} onChange={() => toggle(4 )}/>
          Onder
        </label>
      </header>
    </div>
  );
}

function CurrentTemp() {
  const [temp, setTemp] = useState(null);

  useEffect(() => {
    const id = setInterval(async () => {
      console.log("ping");
      // const response = await axios.get(url + 'temp');
      // const temp = response.data.temperature;
      // setTemp(temp)
    }, 3000)

    return () => clearInterval(id)
  })

  return <div>
    Current: {temp || "-"}
  </div>
}

export default App;
