import logo from './logo.svg';
import './App.css';
import axios from "axios";

const url = "http://sauna.local:8001/";

async function set(switchNr, enable) {
  console.log({switchNr, enable})
  await axios.get(url + 'set/', {params: {switchNr, enable: enable ? "1" : "0"}})
}

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <label>
          <input type={"checkbox"} onChange={(event) => set(1, event.target.value )}/>
          Links voor
        </label>
        <label>
          <input type={"checkbox"} onChange={(event) => set(2, event.target.value )}/>
          Rechts voor
        </label>
      </header>
    </div>
  );
}

export default App;
