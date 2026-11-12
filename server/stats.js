// Usage logging for the sauna: every session (power on -> power off) is stored
// in a SQLite database together with temperature samples taken during it.
//
// Nothing in here is allowed to throw: logging must never get in the way of
// controlling the heating panels.

const fs = require("fs");
const path = require("path");
const initSqlJs = require("sql.js");

// location of the SQLite database file
const DB_FILE =
  process.env.SAUNA_DB || path.join(__dirname, "data", "sauna.db");

// seconds between temperature samples during a session
const SAMPLE_INTERVAL = 30;

// sessions shorter than this are not counted as "using the sauna"
const MIN_SESSION_SECONDS = 5 * 60;

let db = null;
let session = null;

const now = () => Math.floor(Date.now() / 1000);

function guard(name, fn, fallback) {
  try {
    return fn();
  } catch (err) {
    console.error(`stats: ${name} failed`, err);
    return fallback;
  }
}

async function init() {
  try {
    const SQL = await initSqlJs();
    db = fs.existsSync(DB_FILE)
      ? new SQL.Database(fs.readFileSync(DB_FILE))
      : new SQL.Database();
    db.run(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        started_at INTEGER NOT NULL,      -- unix seconds
        ended_at INTEGER,
        end_reason TEXT,                  -- manual, timer, shutdown, interrupted
        start_temp REAL,
        max_temp REAL,
        target_temp REAL,
        heating_seconds INTEGER NOT NULL DEFAULT 0,
        seconds_to_target INTEGER         -- null if target was never reached
      );
      CREATE TABLE IF NOT EXISTS samples (
        session_id INTEGER NOT NULL,
        ts INTEGER NOT NULL,              -- unix seconds
        temp REAL NOT NULL,
        target_temp REAL NOT NULL,
        heating INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS samples_session ON samples (session_id, ts);
    `);
    // close sessions that were cut short by a crash or power loss
    db.run(`
      UPDATE sessions
      SET end_reason = 'interrupted',
          ended_at = COALESCE(
            (SELECT MAX(ts) FROM samples WHERE session_id = sessions.id),
            started_at)
      WHERE ended_at IS NULL
    `);
    save();
    console.log(`stats: logging to ${DB_FILE}`);
  } catch (err) {
    db = null;
    console.error("stats: could not open database, logging disabled", err);
  }
}

// write the database to disk, atomically
function save() {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
  const tmp = DB_FILE + ".tmp";
  fs.writeFileSync(tmp, Buffer.from(db.export()));
  fs.renameSync(tmp, DB_FILE);
}

function query(sql, params = []) {
  const stmt = db.prepare(sql);
  const rows = [];
  try {
    stmt.bind(params);
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
  } finally {
    stmt.free();
  }
  return rows;
}

function addSample(state) {
  if (typeof state.currentTemp !== "number") {
    return;
  }
  db.run(
    "INSERT INTO samples (session_id, ts, temp, target_temp, heating) VALUES (?, ?, ?, ?, ?)",
    [
      session.id,
      now(),
      state.currentTemp,
      state.targetTemp,
      state.power === "heating" ? 1 : 0,
    ]
  );
}

function updateSession(state) {
  db.run(
    "UPDATE sessions SET max_temp = ?, target_temp = ?, heating_seconds = ?, seconds_to_target = ? WHERE id = ?",
    [
      session.maxTemp,
      state.targetTemp,
      session.heatingSeconds,
      session.secondsToTarget,
      session.id,
    ]
  );
}

// state = { power, currentTemp, targetTemp }
function startSession(state) {
  if (!db || session) {
    return;
  }
  guard("startSession", () => {
    const startedAt = now();
    const temp =
      typeof state.currentTemp === "number" ? state.currentTemp : null;
    db.run(
      "INSERT INTO sessions (started_at, start_temp, max_temp, target_temp) VALUES (?, ?, ?, ?)",
      [startedAt, temp, temp, state.targetTemp]
    );
    session = {
      id: query("SELECT last_insert_rowid() AS id")[0].id,
      startedAt,
      maxTemp: temp,
      heatingSeconds: 0,
      secondsToTarget: null,
      sinceSample: 0,
    };
    addSample(state);
    save();
  });
}

function endSession(state, reason) {
  if (!db || !session) {
    return;
  }
  guard("endSession", () => {
    addSample(state);
    updateSession(state);
    db.run("UPDATE sessions SET ended_at = ?, end_reason = ? WHERE id = ?", [
      now(),
      reason,
      session.id,
    ]);
    save();
  });
  session = null;
}

// call once per second
function tick(state) {
  if (!db || !session) {
    return;
  }
  guard("tick", () => {
    if (state.power === "heating") {
      session.heatingSeconds++;
    }
    if (typeof state.currentTemp === "number") {
      if (session.maxTemp === null || state.currentTemp > session.maxTemp) {
        session.maxTemp = state.currentTemp;
      }
      if (
        session.secondsToTarget === null &&
        state.currentTemp >= state.targetTemp
      ) {
        session.secondsToTarget = now() - session.startedAt;
      }
    }
    if (++session.sinceSample >= SAMPLE_INTERVAL) {
      session.sinceSample = 0;
      addSample(state);
      updateSession(state);
      save();
    }
  });
}

const avg = (values) =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;

const monthKey = (date) =>
  `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}`;

function summarize(sessions) {
  const weekdays = [0, 0, 0, 0, 0, 0, 0];
  sessions.forEach((s) => weekdays[new Date(s.startedAt * 1000).getDay()]++);
  return {
    sessions: sessions.length,
    hours: sessions.reduce((sum, s) => sum + s.durationSeconds, 0) / 3600,
    heatingHours: sessions.reduce((sum, s) => sum + s.heatingSeconds, 0) / 3600,
    avgMinutes: avg(sessions.map((s) => s.durationSeconds / 60)),
    avgMaxTemp: avg(sessions.map((s) => s.maxTemp).filter((t) => t !== null)),
    // warm-up time, ignoring sessions that started at or above the target
    avgMinutesToTarget: avg(
      sessions
        .filter((s) => s.secondsToTarget > 0 && s.startTemp < s.targetTemp)
        .map((s) => s.secondsToTarget / 60)
    ),
    maxTemp: sessions.reduce(
      (max, s) => (s.maxTemp !== null && s.maxTemp > max ? s.maxTemp : max),
      null
    ),
    // sessions per weekday, sunday first
    weekdays,
  };
}

function getStats() {
  if (!db) {
    return null;
  }
  return guard(
    "getStats",
    () => {
      const sessions = query(
        `SELECT id, started_at AS startedAt, ended_at - started_at AS durationSeconds,
                end_reason AS endReason, start_temp AS startTemp, max_temp AS maxTemp,
                target_temp AS targetTemp, heating_seconds AS heatingSeconds,
                seconds_to_target AS secondsToTarget
         FROM sessions
         WHERE ended_at IS NOT NULL AND ended_at - started_at >= ?
         ORDER BY started_at`,
        [MIN_SESSION_SECONDS]
      );

      const today = new Date();
      const yearAgo = new Date(today);
      yearAgo.setFullYear(yearAgo.getFullYear() - 1);
      const since = yearAgo.getTime() / 1000;
      const lastYear = sessions.filter((s) => s.startedAt >= since);

      // the last 12 calendar months, including the current one
      const perMonth = [];
      for (let i = 11; i >= 0; i--) {
        const month = monthKey(
          new Date(today.getFullYear(), today.getMonth() - i, 1)
        );
        perMonth.push({ month, sessions: 0 });
      }
      sessions.forEach((s) => {
        const key = monthKey(new Date(s.startedAt * 1000));
        const bucket = perMonth.find((m) => m.month === key);
        if (bucket) {
          bucket.sessions++;
        }
      });

      return {
        last12Months: summarize(lastYear),
        allTime: {
          ...summarize(sessions),
          firstSession: sessions.length ? sessions[0].startedAt : null,
        },
        perMonth,
        recent: sessions.slice(-10).reverse(),
        minSessionSeconds: MIN_SESSION_SECONDS,
      };
    },
    null
  );
}

// temperature curve of a single session
function getSession(id) {
  if (!db) {
    return null;
  }
  return guard(
    "getSession",
    () => {
      const rows = query(
        `SELECT id, started_at AS startedAt, ended_at AS endedAt, end_reason AS endReason,
                max_temp AS maxTemp, target_temp AS targetTemp
         FROM sessions WHERE id = ?`,
        [id]
      );
      if (!rows.length) {
        return null;
      }
      const samples = query(
        `SELECT ts - ? AS t, temp, target_temp AS targetTemp, heating
         FROM samples WHERE session_id = ? ORDER BY ts`,
        [rows[0].startedAt, id]
      );
      return { ...rows[0], samples };
    },
    null
  );
}

module.exports = { init, startSession, endSession, tick, getStats, getSession };
