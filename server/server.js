const Gpio = require('onoff').Gpio;
const express = require('express')
const cors = require('cors')
const ds18b20 = require("ds18b20");

const PORT = 8001;
const LIGHT_SWITCH_NR = 5;
const COLOR_SWITCH_NR = 6;
const SIMULATE = true;
const SENSITIVITY = 0.1;

// tutorial for enabling the one-wire interface:
// https://www.circuitbasics.com/raspberry-pi-ds18b20-temperature-sensor-tutorial/
// 28-06201c5a979c

// raspberry pi pinout:
// https://www.raspberrypi-spy.co.uk/2012/06/simple-guide-to-the-rpi-gpio-header-and-pins/

// interfaces to the relais
const switches = SIMULATE ? [] : [
  new Gpio(14, 'out'),
  new Gpio(15, 'out'),
  new Gpio(18, 'out'),
  new Gpio(23, 'out'),
  new Gpio(24, 'out'),
  new Gpio(25, 'out'),
  new Gpio(8, 'out'),
  new Gpio(7, 'out'),
];

let currentTemp = null;
let targetTemp = 50;
let isWorking = false;
let isOn = true;
let isLightEnabled = false;
let isColorEnabled = false;
let panelsEnabled = [true, true, true, true, true];

async function main() {
  // get the id of the first connected sensor
  const sensorId = await getSensorId();
  const temp = getTemperature(sensorId);
  console.log(`Found sensor: ${sensorId} with current temperature ${temp}`);

  const app = express();

  app.use(cors());

  app.get('/', (req, res) => {
    res.send('Hello World!')
  })

  app.get('/temp', (req, res) => {
    res.json({temp: currentTemp})
  })

  app.get('/set', (req, res) => {
    const switchNr = req.query.switchNr;
    const enable = req.query.enable === "1";
    if (!SIMULATE) {
      switches[switchNr].writeSync(enable ? Gpio.HIGH: Gpio.LOW);
    }
    console.log(`Setting switch ${switchNr} to ${enable}`);
    res.json({result: "ok"})
  })

  app.listen(PORT, () => {
    console.log(`Sauna-os listening on port ${PORT}`)
  })

  // read temperature
  setInterval(() => {
    const temp = getTemperature(sensorId);
    console.log(`Current temperature is ${temp}`);
    currentTemp = temp;
  }, 3000);

  // check if we need to start/stop heating
  setInterval(() => {
    if (isOn) {
      // check if we need to start heating
      if (!isWorking && currentTemp < targetTemp*(1-SENSITIVITY)) {
        isWorking = true;
        console.log("start heating");
      }

      // check if we need to stop heating
      if (isWorking &&currentTemp > targetTemp*(1+SENSITIVITY)) {
        isWorking = false;
        console.log("stop heating");
      }
    } else {
      // todo do some sanity checks?
    }
  }, 3000);

}

main();


function getTemperature(sensorId) {
  if (SIMULATE) {
    return 22;
  } else {
    return ds18b20.temperatureSync(sensorId);
  }
}

// get id of the first ds18b20 sensor we find
function getSensorId() {
  if (SIMULATE) {
    return "simulated-sensor"
  } else {
    return new Promise((resolve, reject) => {
      ds18b20.sensors(function (err, ids) {
        if (err) {
          reject(err);
        } else {
          if (ids.length > 0) {
            resolve(ids[0]);
          } else {
            reject(new Error("No temperature sensors found"))
          }
        }
      });
    })
  }
}