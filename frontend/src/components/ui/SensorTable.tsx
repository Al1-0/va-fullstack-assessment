import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { SensorMetadata } from '@/lib/api-client';
import { LatestReading } from '@/hooks/useTelemetry';

interface SensorTableProps {
  metadataMap: Map<number, SensorMetadata>;
  latestReadings: Map<number, LatestReading>;
  outOfRangeCounts: Map<number, number>;
}

export function SensorTable({ metadataMap, latestReadings, outOfRangeCounts }: SensorTableProps) {
  const sensors = Array.from(metadataMap.values()).sort((a, b) =>
    a.sensorName.localeCompare(b.sensorName)
  );

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Sensor</TableHead>
          <TableHead>ID</TableHead>
          <TableHead>Reading</TableHead>
          <TableHead>Timestamp</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Out-of-range (5s)</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sensors.map((sensor) => {
          const latest = latestReadings.get(sensor.sensorId);
          const outCount = outOfRangeCounts.get(sensor.sensorId) ?? 0;

          return (
            <TableRow key={sensor.sensorId}>
              <TableCell>{sensor.sensorName}</TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">
              {sensor.sensorId}
              </TableCell>

              <TableCell className="font-mono">
                  {latest
                  ? `${latest.reading.value.toFixed(1)} ${sensor.unit}`
                  : '—'}
              </TableCell>

              <TableCell className="text-muted-foreground">
                {latest
                  ? new Date(latest.reading.timestamp * 1000).toLocaleTimeString()
                  : '—'}
              </TableCell>

              <TableCell>
                {!latest ? (
                  <Badge variant="outline">No data</Badge>
                ) : latest.inRange ? (
                  <Badge className="bg-green-500/20 text-green-400">In range</Badge>
                ) : (
                  <Badge variant="destructive">Out of range</Badge>
                )}
              </TableCell>

            <TableCell className={outCount > 3 ? 'font-semibold text-destructive' : ''}>
                {outCount}
            </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}