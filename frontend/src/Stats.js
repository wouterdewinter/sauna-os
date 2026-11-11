import axios from "axios";
import { useEffect, useState } from "react";
import {
  AppBar,
  Dialog,
  Grid,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Toolbar,
  Typography,
} from "@mui/material";
import { Close } from "@mui/icons-material";

const SERIES = "#1976d2";
const MUTED = "#757575";
const GRID = "#e0e0e0";

const MONTHS = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ");
const WEEKDAYS =
  "Sunday Monday Tuesday Wednesday Thursday Friday Saturday".split(" ");

const round = (value, digits = 0) =>
  value === null || value === undefined ? "–" : value.toFixed(digits);

const formatDate = (seconds) =>
  new Date(seconds * 1000).toLocaleString([], {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

function Stats({ url, open, onClose }) {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(false);
  const [session, setSession] = useState(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    let cancelled = false;
    async function load() {
      try {
        const response = await axios.get(url + "stats");
        if (cancelled) {
          return;
        }
        setError(!response.data);
        setStats(response.data);
        const latest = response.data && response.data.recent[0];
        if (latest) {
          const detail = await axios.get(`${url}stats/session/${latest.id}`);
          if (!cancelled) {
            setSession(detail.data);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(true);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [open, url]);

  async function selectSession(id) {
    const response = await axios.get(`${url}stats/session/${id}`);
    setSession(response.data);
  }

  const year = stats && stats.last12Months;
  const favorite =
    year && year.sessions
      ? WEEKDAYS[year.weekdays.indexOf(Math.max(...year.weekdays))]
      : "–";

  return (
    <Dialog fullScreen open={open} onClose={onClose}>
      <AppBar position="sticky">
        <Toolbar>
          <Typography variant="h6" sx={{ flex: 1 }}>
            Statistics
          </Typography>
          <IconButton color="inherit" onClick={onClose} aria-label="close">
            <Close />
          </IconButton>
        </Toolbar>
      </AppBar>
      <div
        style={{
          maxWidth: "600px",
          width: "100%",
          margin: "0 auto",
          padding: "16px",
          boxSizing: "border-box",
        }}
      >
        {error && <Typography>Could not load the statistics.</Typography>}
        {!error && !stats && <Typography>Loading…</Typography>}
        {stats && (
          <>
            <Paper sx={{ p: 2, mb: 2, textAlign: "center" }}>
              <Typography variant="body2" color="text.secondary">
                Sessions in the last 12 months
              </Typography>
              <Typography variant="h2">{year.sessions}</Typography>
              <Typography variant="body2" color="text.secondary">
                {stats.allTime.sessions} in total
                {stats.allTime.firstSession &&
                  ` since ${new Date(
                    stats.allTime.firstSession * 1000
                  ).toLocaleDateString([], {
                    month: "short",
                    year: "numeric",
                  })}`}
              </Typography>
            </Paper>

            <Paper sx={{ p: 2, mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Sessions per month
              </Typography>
              <MonthChart data={stats.perMonth} />
            </Paper>

            <Typography variant="subtitle2" gutterBottom>
              Last 12 months
            </Typography>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Tile label="Time in use" value={`${round(year.hours, 1)} h`} />
              <Tile
                label="Panels heating"
                value={`${round(year.heatingHours, 1)} h`}
              />
              <Tile
                label="Avg session"
                value={`${round(year.avgMinutes)} min`}
              />
              <Tile
                label="Avg warm-up to target"
                value={`${round(year.avgMinutesToTarget)} min`}
              />
              <Tile
                label="Avg peak temp"
                value={`${round(year.avgMaxTemp)}°`}
              />
              <Tile
                label="Hottest ever"
                value={`${round(stats.allTime.maxTemp)}°`}
              />
              <Tile label="Favorite day" value={favorite} wide />
            </Grid>

            {session && (
              <Paper sx={{ p: 2, mb: 2 }}>
                <Typography variant="subtitle2">Temperature</Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {formatDate(session.startedAt)}
                </Typography>
                <TempChart samples={session.samples} />
              </Paper>
            )}

            <Typography variant="subtitle2">Recent sessions</Typography>
            {stats.recent.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                No sessions logged yet. Sessions shorter than{" "}
                {stats.minSessionSeconds / 60} minutes are not counted.
              </Typography>
            )}
            <List dense>
              {stats.recent.map((s) => (
                <ListItemButton
                  key={s.id}
                  selected={session && session.id === s.id}
                  onClick={() => selectSession(s.id)}
                >
                  <ListItemText
                    primary={formatDate(s.startedAt)}
                    secondary={`${Math.round(
                      s.durationSeconds / 60
                    )} min · peak ${round(s.maxTemp)}° · target ${round(
                      s.targetTemp
                    )}°`}
                  />
                </ListItemButton>
              ))}
            </List>
          </>
        )}
      </div>
    </Dialog>
  );
}

function Tile({ label, value, wide }) {
  return (
    <Grid item xs={wide ? 12 : 6}>
      <Paper sx={{ p: 1.5, height: "100%", boxSizing: "border-box" }}>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="h6">{value}</Typography>
      </Paper>
    </Grid>
  );
}

// bar per month, value labelled on top of each bar
function MonthChart({ data }) {
  const width = 360;
  const height = 170;
  const top = 20;
  const bottom = 24;
  const max = Math.max(1, ...data.map((d) => d.sessions));
  const step = width / data.length;
  const barWidth = step - 8;
  const plot = height - top - bottom;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      style={{ width: "100%", display: "block" }}
      role="img"
      aria-label="Sessions per month"
    >
      <line
        x1={0}
        x2={width}
        y1={height - bottom}
        y2={height - bottom}
        stroke={GRID}
      />
      {data.map((d, i) => {
        const barHeight = (d.sessions / max) * plot;
        const x = i * step + 4;
        const y = height - bottom - barHeight;
        const month = Number(d.month.split("-")[1]) - 1;
        return (
          <g key={d.month}>
            {d.sessions > 0 && (
              <path
                d={`M${x},${y + barHeight} V${
                  y + Math.min(4, barHeight)
                } Q${x},${y} ${x + 4},${y} H${x + barWidth - 4} Q${
                  x + barWidth
                },${y} ${x + barWidth},${y + Math.min(4, barHeight)} V${
                  y + barHeight
                } Z`}
                fill={SERIES}
              />
            )}
            <text
              x={x + barWidth / 2}
              y={y - 5}
              textAnchor="middle"
              fontSize="11"
              fill={d.sessions ? "#212121" : MUTED}
            >
              {d.sessions}
            </text>
            <text
              x={x + barWidth / 2}
              y={height - 6}
              textAnchor="middle"
              fontSize="11"
              fill={MUTED}
            >
              {MONTHS[month]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// temperature over the course of one session, with the target as reference
function TempChart({ samples }) {
  const [hover, setHover] = useState(null);

  if (!samples || samples.length < 2) {
    return (
      <Typography variant="body2" color="text.secondary">
        No temperature data for this session.
      </Typography>
    );
  }

  const width = 360;
  const height = 200;
  const left = 34;
  const right = 8;
  const top = 12;
  const bottom = 24;

  const duration = samples[samples.length - 1].t || 1;
  const values = samples.flatMap((s) => [s.temp, s.targetTemp]);
  const min = Math.floor(Math.min(...values) / 10) * 10;
  const max = Math.ceil((Math.max(...values) + 1) / 10) * 10;

  const x = (t) => left + (t / duration) * (width - left - right);
  const y = (temp) =>
    top + (1 - (temp - min) / (max - min)) * (height - top - bottom);

  const line = (key) =>
    samples
      .map(
        (s, i) => `${i ? "L" : "M"}${x(s.t).toFixed(1)},${y(s[key]).toFixed(1)}`
      )
      .join(" ");

  const yTicks = [];
  for (let v = min; v <= max; v += 10) {
    yTicks.push(v);
  }
  const minutes = duration / 60;
  const xStep = minutes > 40 ? 10 : 5;
  const xTicks = [];
  for (let m = 0; m <= minutes; m += xStep) {
    xTicks.push(m);
  }

  function onMove(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    const px = ((event.clientX - rect.left) / rect.width) * width;
    const t = ((px - left) / (width - left - right)) * duration;
    let nearest = samples[0];
    samples.forEach((s) => {
      if (Math.abs(s.t - t) < Math.abs(nearest.t - t)) {
        nearest = s;
      }
    });
    setHover(nearest);
  }

  const last = samples[samples.length - 1];
  const shown = hover || last;

  return (
    <>
      <Typography variant="body2" sx={{ minHeight: "1.5em" }}>
        <span style={{ color: MUTED }}>
          {hover ? `${Math.round(hover.t / 60)} min: ` : "End: "}
        </span>
        {round(shown.temp, 1)}° <span style={{ color: MUTED }}>· target</span>{" "}
        {round(shown.targetTemp)}°
        {hover && (
          <span style={{ color: MUTED }}>
            {" "}
            · {hover.heating ? "heating" : "not heating"}
          </span>
        )}
      </Typography>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: "100%", display: "block", touchAction: "pan-y" }}
        role="img"
        aria-label="Temperature during the session"
        onPointerMove={onMove}
        onPointerDown={onMove}
        onPointerLeave={() => setHover(null)}
      >
        {yTicks.map((v) => (
          <g key={v}>
            <line
              x1={left}
              x2={width - right}
              y1={y(v)}
              y2={y(v)}
              stroke={GRID}
            />
            <text
              x={left - 6}
              y={y(v) + 4}
              textAnchor="end"
              fontSize="11"
              fill={MUTED}
            >
              {v}°
            </text>
          </g>
        ))}
        {xTicks.map((m) => (
          <text
            key={m}
            x={x(m * 60)}
            y={height - 6}
            textAnchor="middle"
            fontSize="11"
            fill={MUTED}
          >
            {m ? `${m} min` : "0"}
          </text>
        ))}
        <path
          d={line("targetTemp")}
          fill="none"
          stroke={MUTED}
          strokeWidth="1.5"
          strokeDasharray="5 4"
        />
        <text
          x={left + 4}
          y={y(samples[0].targetTemp) - 6}
          textAnchor="start"
          fontSize="11"
          fill={MUTED}
        >
          target
        </text>
        <path
          d={line("temp")}
          fill="none"
          stroke={SERIES}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {hover && (
          <>
            <line
              x1={x(hover.t)}
              x2={x(hover.t)}
              y1={top}
              y2={height - bottom}
              stroke={MUTED}
            />
            <circle
              cx={x(hover.t)}
              cy={y(hover.temp)}
              r="5"
              fill={SERIES}
              stroke="#fff"
              strokeWidth="2"
            />
          </>
        )}
      </svg>
    </>
  );
}

export default Stats;
