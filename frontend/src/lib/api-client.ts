/**
 * API client for the Vehicle Analytics backend.
 * The backend API surface is designed by you in the fullstack assessment (va-fullstack-assessment).
 * The only guaranteed endpoint is GET /health. You must add functions that call your
 * metadata and data routes (paths and response shapes are up to your API design).
 */

export interface SensorMetadata {
  sensorId: number;
  sensorName: string;
  unit: string;
}

export interface TelemetryReading {
  sensorId: number;
  value: number;
  timestamp: number;
}

export interface TelemetryMessage {
  type: 'snapshot' | 'reading';
  data: Record<string, TelemetryReading> | TelemetryReading;
  inRange?: boolean;
}

export interface HealthResponse {
  status: string;
  emulator?: boolean;
  reason?: string;
}

export interface TelemetryStreamHandlers {
  onOpen?: () => void;
  onError?: (err: Event) => void;
  onClose?: () => void;
}

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

export async function fetchHealth(timeoutMs = 3000): Promise<HealthResponse> {
  const url = `${API_BASE_URL}/health`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { mode: 'cors', signal: controller.signal });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.reason ?? `Health: ${res.status} ${res.statusText}`);
    }
    return data as HealthResponse;
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new Error('Health check timed out');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Add your own functions here to call the metadata and data endpoints you
// designed in the API section (e.g. fetchSensors(), fetchLatestTelemetry(),
// or whatever paths and response shapes you defined). Use the types above
// or define new ones to match your API.
// ---------------------------------------------------------------------------


// metadata API 
export async function fetchSensorMetadata(): Promise<SensorMetadata[]> {
  const res = await fetch(`${API_BASE_URL}/metadata`, { mode: 'cors' });
  if (!res.ok) {
    throw new Error(`Metadata fetch failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

// helper to build map for all sensor meta data
export function buildMetadataMap(metadata: SensorMetadata[]): Map<number, SensorMetadata> {
  return new Map(metadata.map((entry) => [entry.sensorId, entry]));
}

// telemetry steam WS wrapper
export function connectTelemetryStream(
  onMessage: (msg: TelemetryMessage) => void,
  handlers: TelemetryStreamHandlers = {}
): WebSocket {
  const wsUrl = API_BASE_URL.replace(/^http/, 'ws') + '/ws/telemetry';
  const ws = new WebSocket(wsUrl);

  ws.onopen = () => handlers.onOpen?.();
  ws.onerror = (err) => handlers.onError?.(err);
  ws.onclose = () => handlers.onClose?.();

  ws.onmessage = (event) => {
    try {
      onMessage(JSON.parse(event.data) as TelemetryMessage);
    } catch (err) {
      console.error('Failed to parse telemetry message:', err);
    }
  };

  return ws;
}