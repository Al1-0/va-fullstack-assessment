import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SensorMetadata } from '@/lib/api-client';
import { LatestReading } from '@/hooks/useTelemetry';
const VITALS = [
  { name: 'VEHICLE_SPEED',        label: 'Speed',      decimals: 0 },
  { name: 'BRAKE_PRESSURE_FRONT', label: 'Brake',      decimals: 1 },
  { name: 'STEERING_ANGLE',       label: 'Steering',   decimals: 1 },
  { name: 'MOTOR_TEMPERATURE',    label: 'Motor temp', decimals: 1 },
];

interface VitalsPanelProps {
  metadataMap: Map<number, SensorMetadata>;
  latestReadings: Map<number, LatestReading>;
}

export function VitalsPanel({ metadataMap, latestReadings }: VitalsPanelProps) {
  const metadataList = Array.from(metadataMap.values());

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
          Vitals
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {VITALS.map((vital) => {
          const meta = metadataList.find((m) => m.sensorName === vital.name);
          const latest = meta ? latestReadings.get(meta.sensorId) : undefined;
          const outOfRange = latest !== undefined && !latest.inRange;

          return (
            <div key={vital.name}>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{vital.label}</span>
                {outOfRange && (
                  <span className="rounded-full bg-destructive/20 px-2 py-0.5 text-[10px] font-medium text-destructive">
                    Out of range
                  </span>
                )}
              </div>
              <div
                className={`text-3xl font-semibold tabular-nums ${
                  outOfRange ? 'text-destructive' : ''
                }`}
              >
                {latest && meta ? (
                  <>
                    {latest.reading.value.toFixed(vital.decimals)}
                    <span className="ml-1 text-base font-normal text-muted-foreground">
                      {meta.unit}
                    </span>
                  </>
                ) : (
                  '—'
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}