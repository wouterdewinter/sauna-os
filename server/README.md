# Sauna-OS Server

This is the server-side code for Sauna-OS, a Raspberry Pi-based system for managing a sauna. This server handles temperature sensing, relay switching, and provides an API for the front-end user interface.

## Features

- Temperature sensing with DS18B20 sensor
- Relay control for heating panels, light, and color
- Adjustable target temperature
- Countdown timer
- Light and color control

## Installation

1. Install the required dependencies:

    ```
    npm install
    ```

2. Enable the one-wire interface on your Raspberry Pi. Follow this tutorial:
   [https://www.circuitbasics.com/raspberry-pi-ds18b20-temperature-sensor-tutorial/](https://www.circuitbasics.com/raspberry-pi-ds18b20-temperature-sensor-tutorial/)

3. Connect the DS18B20 temperature sensor and relays to the appropriate GPIO pins on the Raspberry Pi. Refer to this pinout guide:
   [https://www.raspberrypi-spy.co.uk/2012/06/simple-guide-to-the-rpi-gpio-header-and-pins/](https://www.raspberrypi-spy.co.uk/2012/06/simple-guide-to-the-rpi-gpio-header-and-pins/)

## Usage

1. Start the server:

    ```
    npm start
    ```

2. Access the front-end user interface by navigating to the Raspberry Pi's IP address on port 80.

## API Endpoints

- `/power/:enable`: Enable or disable the power (standby or off)
- `/light/:enable`: Enable or disable the light
- `/color/:enable`: Enable or disable the color
- `/timer/reset`: Reset the timer to the default value
- `/status`: Get the current status of the sauna
- `/target`: Set the target temperature
- `/temp`: Get the current temperature
- `/set`: Set the state of a specific heating panel

## Configuration

The server configuration options can be found at the beginning of the `server.js` file:

- `PORT`: Port to run the server on
- `LIGHT_SWITCH_NR`: Relay number for the light
- `COLOR_SWITCH_NR`: Relay number for the color
- `SENSITIVITY`: Temperature sensitivity (% above or below target to switch on/off)
- `MAX_TEMP`: Maximum configurable temperature
- `MIN_TEMP`: Minimum configurable temperature
- `DEFAULT_TIMER`: Default timer setting (in seconds)

## Contributing

Please feel free to submit issues or pull requests for improvements and bug fixes.

## License

MIT