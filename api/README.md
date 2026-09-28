# WebSocket API: `/ws/telemetry`

Live sensor reading stream.

**URL:** `ws://localhost:4000/ws/telemetry`

The stream is one-way (server to client). There subscription is for all sensors.
## What is (and isn't) sent

| Reading type | Sent over WS? | Stored in `/latest` and the snapshot? |
|---|---|---|
| Valid and in range | Yes (`inRange: true`) | Yes |
| Valid but out of range | Yes (`inRange: false`) | No |
| Invalid (wrong types, missing/extra fields, malformed JSON) | No, dropped and logged server-side | No |

Out-of-range readings are streamed so clients can track fault behaviour, but they never overwrite the "latest in-range" state.

## Message types

Every message is a JSON text frame with a `type` field.

### 1. `snapshot`

Sent once, immediately after the connection opens.

```json
{
  "type": "snapshot",
  "data": {
    "3000000060001": { "sensorId": 3000000060001, "value": 67.23, "timestamp": 1790304910.286 },
    "3000000060002": { "sensorId": 3000000060002, "value": 421.9, "timestamp": 1790304910.301 }
  }
}
```

- `data` is an object keyed by `sensorId`. JSON object keys are always strings, so convert with `Number(key)` if you need numeric IDs.
- It holds the latest **in-range** reading per sensor, the same content as `GET /latest`.
- Sensors that haven't reported yet are absent. `data` can be `{}` right after the API starts.

### 2. `reading`

Sent for every valid reading as it arrives from the emulator.

```json
{
  "type": "reading",
  "inRange": false,
  "data": { "sensorId": 3000000060102, "value": 320.1, "timestamp": 1790304911.512 }
}
```

| Field | Type | Description |
|---|---|---|
| `type` | `"reading"` | Message discriminator |
| `inRange` | boolean | `false` if the value is outside the sensor's valid min/max |
| `data.sensorId` | number | Resolve to a name and unit using `GET /metadata` |
| `data.value` | number | Raw sensor value |
| `data.timestamp` | number | Unix time in **seconds**, with a fractional part. Multiply by 1000 for a JS `Date` |

## Recommended client flow

1. `GET /metadata` once and build a `sensorId → { sensorName, unit }` map.
2. Open the WebSocket.
3. On `snapshot`: replace all local state with its contents.
4. On `reading`: update that sensor's entry, and keep `inRange` alongside the value.
5. On close: reconnect after a short delay. A fresh `snapshot` is sent on every new connection, so replacing state on `snapshot` resyncs the client.

```typescript
const meta = new Map((await (await fetch('http://localhost:4000/metadata')).json())
  .map((s) => [s.sensorId, s]));
const latest = new Map();

const ws = new WebSocket('ws://localhost:4000/ws/telemetry');
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.type === 'snapshot') {
    latest.clear();
    for (const r of Object.values(msg.data)) latest.set(r.sensorId, { reading: r, inRange: true });
  } else if (msg.type === 'reading') {
    latest.set(msg.data.sensorId, { reading: msg.data, inRange: msg.inRange });
  }
};
```

## Behaviour and limitations

- **Snapshot is in-range only.** A client that connects while a sensor is out of range won't see that sensor until its next `reading` message.
- **No heartbeat or replay.** Readings sent while a client is disconnected are not replayed, only the snapshot on reconnect.
- **Upstream reconnect.** If the emulator connection drops, the API retries every few seconds. Clients stay connected but receive no `reading` messages until it recovers.
- **Out-of-range logging** (more than 3 in 5 s per sensor) happens on the server console only and is not sent over the stream. Clients can compute their own windowed counts from `inRange: false` messages, as the dashboard does.