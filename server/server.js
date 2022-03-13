const Gpio = require('onoff').Gpio;
const express = require('express')
const ds18b20 = require("ds18b20");

// tutorial for enabling the one-wire interface:
// https://www.circuitbasics.com/raspberry-pi-ds18b20-temperature-sensor-tutorial/
// 28-06201c5a979c

const tempSensorId = "28-06201c5a979c";

// raspberry pi pinout:
// https://www.raspberrypi-spy.co.uk/2012/06/simple-guide-to-the-rpi-gpio-header-and-pins/

const relais = [
  new Gpio(14, 'out'),
  new Gpio(15, 'out'),
  new Gpio(18, 'out'),
  new Gpio(23, 'out'),
  new Gpio(24, 'out'),
  new Gpio(25, 'out'),
  new Gpio(8, 'out'),
  new Gpio(7, 'out'),
]

const temp = ds18b20.temperatureSync(tempSensorId);
console.log("temp is:" +temp);

const app = express()
const port = 8001

app.get('/', (req, res) => {
  res.send('Hello Worlsd!')
})

app.get('/temp', (req, res) => {
  const temp = ds18b20.temperatureSync(tempSensorId);
  res.send('Temp is: '+  temp)
})

app.get('/set', (req, res) => {
  const switchNr = req.query.switchNr;
  const enable = req.query.enable === "1"
  res.send(`Setting switch ${switchNr} to ${enable}`);
  relais[switchNr].writeSync(enable ? Gpio.HIGH: Gpio.LOW);
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})

