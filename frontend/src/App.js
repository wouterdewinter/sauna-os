import "./App.css";
import axios from "axios";
import { useEffect, useState } from "react";
import {
  Button,
  Fab,
  FormControlLabel,
  Grid,
  Paper,
  Switch,
  Typography,
} from "@mui/material";
import PowerSettingsNewIcon from "@mui/icons-material/PowerSettingsNew";
import { Add, Lightbulb, Remove, TipsAndUpdates } from "@mui/icons-material";

const url = "/";
//const url = "http://localhost/";
//const url = "http://sauna.local/";

function App() {
  const initialStatus = {
    currentTemp: 22.8,
    targetTemp: 25,
    power: "off",
    isLightEnabled: false,
    isColorEnabled: false,
    panelsEnabled: [true, true, true, true, true],
    timer: 1800,
  };

  const [status, setStatus] = useState(initialStatus);

  useEffect(() => {
    const id = setInterval(async () => {
      const response = await axios.get(url + "status");
      setStatus(response.data);
    }, 1000);
    return () => clearInterval(id);
  });

  async function toggle(switchNr) {
    const response = await axios.get(url + "set/", {
      params: {
        switchNr,
        enable: !status.panelsEnabled[switchNr] ? "on" : "off",
      },
    });
    setStatus(response.data);
  }

  async function togglePower() {
    const response = await axios.get(
      `${url}power/${status.power === "off" ? "on" : "off"}`
    );
    setStatus(response.data);
  }

  async function toggleLight() {
    const response = await axios.get(
      `${url}light/${!status.isLightEnabled ? "on" : "off"}`
    );
    setStatus(response.data);
  }

  async function toggleColor() {
    const response = await axios.get(
      `${url}color/${!status.isColorEnabled ? "on" : "off"}`
    );
    setStatus(response.data);
  }

  async function setTarget(targetTemp) {
    console.log({ targetTemp });
    const response = await axios.get(`${url}target`, {
      params: { targetTemp },
    });
    setStatus(response.data);
  }

  async function timerReset() {
    const response = await axios.get(`${url}timer/reset`);
    setStatus(response.data);
  }

  return (
    <div className="App">
      <header className="App-header">
        <div style={{ maxWidth: "428px", padding: "10px" }}>
          <Grid container spacing={2} justifyContent={"center"}>
            <Grid item>
              <Fab
                color={status.power === "off" ? "grey" : "primary"}
                aria-label="add"
                onClick={togglePower}
              >
                <PowerSettingsNewIcon color={"white"} fontSize={"large"} />
              </Fab>
            </Grid>
            <Grid item>
              <Fab
                color={status.isLightEnabled ? "primary" : "grey"}
                aria-label="add"
                onClick={toggleLight}
              >
                <Lightbulb color={"white"} fontSize={"large"} />
              </Fab>
            </Grid>
            <Grid item>
              <Fab
                color={status.isColorEnabled ? "primary" : "grey"}
                aria-label="add"
                onClick={toggleColor}
              >
                <TipsAndUpdates color={"white"} fontSize={"large"} />
              </Fab>
            </Grid>
          </Grid>
          <br />
          <Grid container spacing={2} justifyContent={"center"}>
            <Grid item xs={6}>
              <Metric
                label={"Heating"}
                value={status.power === "heating" ? "yes" : "no"}
              />
            </Grid>
            <Grid item xs={6}>
              <Metric
                label={"Timer"}
                value={
                  Math.floor(status.timer / 60) +
                  ":" +
                  `${status.timer % 60}`.padStart(2, "0")
                }
              >
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => timerReset()}
                >
                  Reset
                </Button>
              </Metric>
            </Grid>
          </Grid>
          <br />
          <Grid container spacing={2} justifyContent={"center"}>
            <Grid item xs={6}>
              <Metric label={"Target temp"} value={status.targetTemp} />
            </Grid>
            <Grid item xs={6}>
              <Metric
                label={"Current temp"}
                value={Math.round(status.currentTemp)}
              />
            </Grid>
          </Grid>

          <br />

          <Grid container spacing={2} justifyContent={"center"}>
            <Grid item>
              <Fab
                size={"small"}
                onClick={() => setTarget(status.targetTemp - 1)}
              >
                <Remove color={"white"} fontSize={"small"} />
              </Fab>
            </Grid>
            <Grid item>
              <Fab onClick={() => setTarget(status.targetTemp - 5)}>
                <Remove color={"white"} fontSize={"medium"} />
              </Fab>
            </Grid>
            <Grid item>
              <Fab onClick={() => setTarget(status.targetTemp + 5)}>
                <Add color={"white"} fontSize={"medium"} />
              </Fab>
            </Grid>
            <Grid item>
              <Fab
                onClick={() => setTarget(status.targetTemp + 1)}
                size={"small"}
              >
                <Add color={"white"} fontSize={"small"} />
              </Fab>
            </Grid>
          </Grid>

          <br />
          <FormControlLabel
            control={
              <Switch
                checked={status.panelsEnabled[0]}
                onChange={() => toggle(0)}
              />
            }
            label="Front right"
          />
          <FormControlLabel
            control={
              <Switch
                checked={status.panelsEnabled[1]}
                onChange={() => toggle(1)}
              />
            }
            label="Back right + bottom"
          />
          <FormControlLabel
            control={
              <Switch
                checked={status.panelsEnabled[2]}
                onChange={() => toggle(2)}
              />
            }
            label="Back left"
          />
          <FormControlLabel
            control={
              <Switch
                checked={status.panelsEnabled[3]}
                onChange={() => toggle(3)}
              />
            }
            label="Front left"
          />
        </div>
      </header>
    </div>
  );
}

function Metric(props) {
  return (
    <Paper style={{ height: "100%" }}>
      <div style={{ padding: "10px" }}>
        <Typography variant="body2" color="text.secondary">
          {props.label}
        </Typography>
        <Typography gutterBottom variant="h5" component="div">
          {props.value}
        </Typography>
        {props.children}
      </div>
    </Paper>
  );
}

export default App;
