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
let targetTemp = 25;
let timer = 1800;
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

  // make sure the switches reflect the current status
  updateSwitches();

  // setup express app with cors
  const app = express();
  app.use(cors());

  app.get('/', (req, res) => {
    // todo send html file
    res.send('Hello World!')
  })

  app.get('/power/:enable', (req, res) => {
    isOn = req.params.enable === "on";
    updateSwitches()
    return returnStatus(res);
  })

  app.get('/light/:enable', (req, res) => {
    isLightEnabled = req.params.enable === "on";
    updateSwitches()
    return returnStatus(res);
  })

  app.get('/color/:enable', (req, res) => {
    isColorEnabled = req.params.enable === "on";
    updateSwitches()
    return returnStatus(res);
  })

  app.get('/status', (req, res) => {
    return returnStatus(res);
  })

  app.get('/temp', (req, res) => {
    res.json({temp: currentTemp})
  })

  app.get('/set', (req, res) => {
    const switchNr = req.query.switchNr;
    const enable = req.query.enable === "1";
    console.log(`Setting switch ${switchNr} to ${enable}`);
    panelsEnabled[switchNr] = enable;
    updateSwitches()
    return returnStatus(res);
  })

  // start express app
  app.listen(PORT, () => {
    console.log(`Sauna-os listening on port ${PORT}`)
  })

  // read temperature on regular interval
  setInterval(() => {
    currentTemp = getTemperature(sensorId);
    console.log(`Current temperature is ${currentTemp}`);
  }, 3000);

  // main action loop, see if we need to take action
  setInterval(() => {
    if (isOn) {
      // turn off if timer expired
      if (timer > 0) {
        timer--;
      } else {
        isOn = false;
        isWorking = false;
        updateSwitches();
      }

      // check if we need to start heating
      if (!isWorking && currentTemp < targetTemp*(1-SENSITIVITY)) {
        isWorking = true;
        console.log("start heating");
        updateSwitches();
      }

      // check if we need to stop heating
      if (isWorking &&currentTemp > targetTemp*(1+SENSITIVITY)) {
        isWorking = false;
        console.log("stop heating");
        updateSwitches();
      }
    } else {
      // todo do some sanity checks?
    }
  }, 1000);

}

main();

function updateSwitches() {
  console.log("updating switches");
  if (!SIMULATE) {
    switches[0].writeSync(isOn && isWorking && panelsEnabled[0] ? Gpio.HIGH: Gpio.LOW);
    switches[1].writeSync(isOn && isWorking && panelsEnabled[1] ? Gpio.HIGH: Gpio.LOW);
    switches[2].writeSync(isOn && isWorking && panelsEnabled[2] ? Gpio.HIGH: Gpio.LOW);
    switches[3].writeSync(isOn && isWorking && panelsEnabled[3] ? Gpio.HIGH: Gpio.LOW);
    switches[4].writeSync(isOn && isWorking && panelsEnabled[4] ? Gpio.HIGH: Gpio.LOW);
    switches[LIGHT_SWITCH_NR].writeSync(isLightEnabled ? Gpio.HIGH: Gpio.LOW);
    switches[COLOR_SWITCH_NR].writeSync(isColorEnabled ? Gpio.HIGH: Gpio.LOW);
  }
}

function returnStatus(res) {
  return res.json({currentTemp, targetTemp, isWorking, isOn, isLightEnabled, isColorEnabled, panelsEnabled, timer})
}

function getTemperature(sensorId) {
  if (SIMULATE) {
    if (!currentTemp) {
      currentTemp = 22;
    }
    if (isWorking) {
      currentTemp+=0.3;
    } else {
      if (currentTemp>15) {
        currentTemp-=0.1;
      }
    }
    return currentTemp
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