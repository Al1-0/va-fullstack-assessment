import http from 'http';
import express from 'express';
import cors from 'cors';
import {WebSocket, WebSocketServer} from 'ws';
import { SensorMetaData, getAllSensorMetaData, SensorReading, loadSensorMetadata, getSensorMetaData, isValid, inRange} from '.';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';

const app = express();
app.use(cors({ origin: true, credentials: false }));
app.use(express.json());

// Default to local emulator when EMULATOR_URL is not provided.
const EMULATOR_URL = process.env.EMULATOR_URL || 'http://localhost:3001';

app.get('/health', async (_req, res) => {
  try {
    const r = await fetch(`${EMULATOR_URL.replace(/\/$/, '')}/sensors`);
    if (r.ok) {
      return res.json({ status: 'ok', emulator: true });
    }
  } catch {
    // connection failed
  }
  res.status(503).json({ status: 'unhealthy', emulator: false });
});

// ---------------------------------------------------------------------------
// Assessment: implement the API below.
// The emulator is a black box: it only outputs data. Its base URL is EMULATOR_URL
// (e.g. http://emulator:3001 with Docker, or http://localhost:3001 locally).
// Emulator exposes onCly:
//   GET {EMULATOR_URL}/sensors   → static metadata (sensorId, sensorName, unit)
//   WS  {EMULATOR_URL}/ws/telemetry → stream of readings { sensorId, value, timestamp }
// The emulator does not store or serve "latest" readings. You must:
// - Connect to the emulator WebSocket stream.
// - Store the latest value per sensor in the API as readings arrive.
// - Expose your own metadata and "latest telemetry" routes to clients.
// Do not modify the emulator service.
// ---------------------------------------------------------------------------

const server = http.createServer(app);

const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || '0.0.0.0';

let latestReadings: Map<number, SensorReading> = new Map();
let outOfRangeReadings: Map<number, SensorReading[]> = new Map();

const openapiSpec = YAML.load(path.join(__dirname, '../openapi.yaml'));

// Swagger UI
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec));

// returns all sensor meta data to client
app.get('/metadata', (_req, res) => {
  const data = getAllSensorMetaData();
  res.json(data);
});

// returns latest readings per sensor
app.get('/latest', (_req, res) => {
  const jsonData = Object.fromEntries(latestReadings);
  res.json(jsonData);
});

// check if at more than 3 out-of-range readings are within 5 seconds
// return error messgae if they are and warning if not
function outOfRangeHandler(reading: SensorReading) {

  let sensorValues = outOfRangeReadings.get(reading.sensorId);
  if (sensorValues === undefined) {
    sensorValues = [reading]
    outOfRangeReadings.set(reading.sensorId, sensorValues);
    return;
    // print nothing on a sensors first invalid reading
  }

  sensorValues.push(reading);

  const metaData = getSensorMetaData(reading.sensorId);
  const date = new Date(reading.timestamp * 1000);

  if (sensorValues.length < 4 ||
      Math.abs(sensorValues[3].timestamp - sensorValues[0].timestamp) > 5
    ) {
    console.log(`WARNING: Out-of-Range Reading -- ${metaData?.sensorName} (${metaData?.sensorId} reading: ${reading.value} ${metaData?.unit} at ${date.toUTCString()})`);
  }
  else {
    console.log(`ERROR: Out-of-Range Reading (More than 3 within 5 seconds) -- ${metaData?.sensorName} (${metaData?.sensorId} reading: ${reading.value} ${metaData?.unit} at ${date.toUTCString()})`);
  }

  if (sensorValues.length == 4) sensorValues.shift(); // pop the oldest reading

  outOfRangeReadings.set(reading.sensorId, sensorValues); // update out-of-range archive
  return;
}

// helper: push valid reading to client
function broadcastReading(reading: SensorReading, inRange_: boolean) {
  const payload = JSON.stringify({ type: 'reading', inRange: inRange_,data: reading});
  for (const client of wss.clients) {
    if (client.readyState === client.OPEN) {
      client.send(payload);
    }
  }
}

function connectToEmulatorStream() {
  const emulatorWs = new WebSocket(`${EMULATOR_URL.replace('http', 'ws')}/ws/telemetry`);

  emulatorWs.on('open', () => {
    console.log('Connected to emulator sensor data stream');
  });

  emulatorWs.on('message', (raw) => {
    try {
      const reading = JSON.parse(raw.toString());

      if (isValid(reading)) {
        if (!inRange(reading)) {
          outOfRangeHandler(reading);
        } else {
          latestReadings.set(reading.sensorId, reading); // only add in-range and valid readings
        }

        broadcastReading(reading, inRange(reading));
      }
    } catch (error) {
      console.log(error);
    }
    
  });

  emulatorWs.on('error', (err) => {
    console.error('Emulator WS error:', err);
  });

  emulatorWs.on('close', () => {
    console.log('Emulator WS connection lost: attempting to reconnect in 5s...');
    setTimeout(connectToEmulatorStream, 5000);
  });
}

const wss = new WebSocketServer({ server, path: '/ws/telemetry' }); // own websocket server to send latest data as a stream

wss.on("connection", (client) => {
  console.log(`---Sensor Data API stream connected---`);

  const jsonLatestReadings = Object.fromEntries(latestReadings);
  client.send(JSON.stringify({ type: 'snapshot', data: jsonLatestReadings }));

  client.on('close', () => {
    console.log('---Sensor Data API stream closed---');
  });

  client.on('error', (err) => {
    console.error('-- Websocket error: ', err);
  });
});

async function main() {
  await loadSensorMetadata();
  connectToEmulatorStream();
  server.listen(Number(PORT), HOST, () => {
    console.log(`API server listening on http://${HOST}:${PORT}`);
  });
}

main();
