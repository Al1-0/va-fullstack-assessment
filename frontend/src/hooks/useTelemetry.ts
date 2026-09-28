'use client';

import { useEffect, useRef, useState } from 'react';
import {
  buildMetadataMap,
  connectTelemetryStream,
  fetchSensorMetadata,
  SensorMetadata,
  TelemetryMessage,
  TelemetryReading,
} from '@/lib/api-client';

export type ConnectionStatus = 'connecting' | 'open' | 'closed';

export interface LatestReading {
  reading: TelemetryReading;
  inRange: boolean;
}

const WINDOW_MS = 5000;          // out-of-range window (5s)
const RECONNECT_DELAY_MS = 5000; // wait 5s before reconnecting to a dropped connection

export function useTelemetry() {
  const [metadataMap, setMetadataMap] = useState<Map<number, SensorMetadata>>(new Map());
  const [latestReadings, setLatestReadings] = useState<Map<number, LatestReading>>(new Map());
  const [outOfRangeCounts, setOutOfRangeCounts] = useState<Map<number, number>>(new Map());
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [error, setError] = useState<string | null>(null);

  // Per-sensor timestamps of recent out-of-range readings.
  // A ref because we don't want to re-render every time this list changes.
  const outOfRangeTimes = useRef<Map<number, number[]>>(new Map());

  // Retrieve meta data once 
  useEffect(() => {
    let cancelled = false;

    fetchSensorMetadata()
      .then((list) => {
        if (!cancelled) setMetadataMap(buildMetadataMap(list));
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // WS for telemetry streaming
  useEffect(() => {
    let ws: WebSocket | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    const handleMessage = (msg: TelemetryMessage) => {
      if (msg.type === 'snapshot') { // on connect a snapshot is sent (all sensors latest inrange readings)
        const snapshot = msg.data as Record<string, TelemetryReading>;
        const next = new Map<number, LatestReading>();
        for (const reading of Object.values(snapshot)) {
          next.set(reading.sensorId, { reading, inRange: true });
        }
        setLatestReadings(next);
        return;
      }

      if (msg.type === 'reading') {
        const reading = msg.data as TelemetryReading;
        const id = reading.sensorId;

        // update map entry for sensor
        setLatestReadings((prev) =>
          new Map(prev).set(id, { reading, inRange: msg.inRange !== false })
        );

        // Sliding 5s window of out-of-range readings for this sensor.
        const now = Date.now();
        const times = (outOfRangeTimes.current.get(id) ?? []).filter(
          (t) => now - t <= WINDOW_MS
        );
        if (msg.inRange === false) times.push(now);
        outOfRangeTimes.current.set(id, times);

        // Return prev unchanged if the count is the same, so React skips the re-render.
        setOutOfRangeCounts((prev) =>
          prev.get(id) === times.length ? prev : new Map(prev).set(id, times.length)
        );
      }
    };

    const connect = () => {
      setStatus('connecting');
      ws = connectTelemetryStream(handleMessage, {
        onOpen: () => setStatus('open'),
        onClose: () => {
          setStatus('closed');
          if (!cancelled) retryTimer = setTimeout(connect, RECONNECT_DELAY_MS);
        },
      });
    };

    connect();

    // close socket
    return () => {
      cancelled = true;
      clearTimeout(retryTimer);
      ws?.close();
    };
  }, []);

  return { metadataMap, latestReadings, outOfRangeCounts, status, error };
}