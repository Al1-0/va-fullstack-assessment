'use client';

import { useState, type KeyboardEvent } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SensorMetadata } from '@/lib/api-client';
import { LatestReading } from '@/hooks/useTelemetry';

type GroupKey = 'tyres' | 'battery';

const GROUPS: Record<GroupKey, { label: string; sensors: string[] }> = {
  tyres: {
    label: 'Tyres',
    sensors: ['TYRE_PRESSURE_FL', 'TYRE_PRESSURE_FR', 'TYRE_PRESSURE_RL', 'TYRE_PRESSURE_RR'],
  },
  battery: {
    label: 'Battery pack',
    sensors: ['BATTERY_TEMPERATURE', 'PACK_CURRENT', 'PACK_VOLTAGE', 'PACK_SOC'],
  },
};

const WHEELS = [
  { name: 'TYRE_PRESSURE_FL', label: 'FL', x: 62,  y: 80,  side: 'left' },
  { name: 'TYRE_PRESSURE_FR', label: 'FR', x: 210, y: 80,  side: 'right' },
  { name: 'TYRE_PRESSURE_RL', label: 'RL', x: 62,  y: 340, side: 'left' },
  { name: 'TYRE_PRESSURE_RR', label: 'RR', x: 210, y: 340, side: 'right' },
] as const;

interface DiagramProps {
  metadataMap: Map<number, SensorMetadata>;
  latestReadings: Map<number, LatestReading>;
}

export function Diagram({ metadataMap, latestReadings }: DiagramProps) {
  const [selected, setSelected] = useState<GroupKey | null>(null);

  const metaByName = new Map(Array.from(metadataMap.values()).map((m) => [m.sensorName, m]));
  const getSensor = (name: string) => {
    const meta = metaByName.get(name);
    const latest = meta ? latestReadings.get(meta.sensorId) : undefined;
    return { meta, latest };
  };

  const isOut = (name: string) => {
    const { latest } = getSensor(name);
    return latest !== undefined && !latest.inRange;
  };
  const batteryOut = GROUPS.battery.sensors.some(isOut);

  const toggle = (group: GroupKey) => setSelected((cur) => (cur === group ? null : group));

  const zoneProps = (group: GroupKey, label: string) => ({
    role: 'button',
    tabIndex: 0,
    'aria-label': label,
    onClick: () => toggle(group),
    onKeyDown: (e: KeyboardEvent<SVGGElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggle(group);
      }
    },
    className: 'cursor-pointer outline-none transition-opacity hover:opacity-80 focus-visible:opacity-80',
  });

  const wheelFill = (name: string) => {
    const { latest } = getSensor(name);
    if (!latest) return 'fill-muted';
    return latest.inRange ? 'fill-green-500/70' : 'fill-destructive';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
          Vehicle
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <svg viewBox="0 0 300 500" className="mx-auto w-full max-w-xs" role="group" aria-label="Car diagram">
          <g {...zoneProps('battery', 'Show battery pack sensors')}>
            <rect
              x="100" y="40" width="100" height="420" rx="30"
              className={
                batteryOut
                  ? 'fill-destructive/30 stroke-destructive'
                  : selected === 'battery'
                    ? 'fill-card stroke-foreground'
                    : 'fill-card stroke-border'
              }
              strokeWidth="2"
            />
            <text x="150" y="245" textAnchor="middle" className="fill-muted-foreground text-[13px]">
              Battery
            </text>
            <text x="150" y="263" textAnchor="middle" className="fill-muted-foreground text-[10px]">
              click for details
            </text>
          </g>

          {WHEELS.map((w) => {
            const { meta, latest } = getSensor(w.name);
            const textX = w.side === 'left' ? w.x - 8 : w.x + 28 + 8;
            const anchor = w.side === 'left' ? 'end' : 'start';

            return (
              <g key={w.name} {...zoneProps('tyres', `Show tyre pressures (${w.label})`)}>
                <rect
                  x={w.x} y={w.y} width="28" height="70" rx="5"
                  className={`${wheelFill(w.name)} ${selected === 'tyres' ? 'stroke-foreground' : 'stroke-transparent'}`}
                  strokeWidth="2"
                />
                <text x={textX} y={w.y + 28} textAnchor={anchor} className="fill-muted-foreground text-[11px]">
                  {w.label}
                </text>
                <text
                  x={textX} y={w.y + 48} textAnchor={anchor}
                  className={`text-[14px] font-semibold ${
                    latest && !latest.inRange ? 'fill-destructive' : 'fill-foreground'
                  }`}
                >
                  {latest && meta ? latest.reading.value.toFixed(1): '—'}
                </text>
              </g>
            );
          })}
        </svg>

        {selected ? (
          <div className="rounded-lg border border-border p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">{GROUPS[selected].label}</h3>
              <button
                onClick={() => setSelected(null)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Close
              </button>
            </div>
            <ul className="space-y-2">
              {GROUPS[selected].sensors.map((name) => {
                const { meta, latest } = getSensor(name);
                const out = latest !== undefined && !latest.inRange;
                return (
                  <li key={name} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{name}</span>
                    <span className={`font-mono tabular-nums ${out ? 'text-destructive' : ''}`}>
                      {latest && meta
                        ? `${latest.reading.value.toFixed(1)} ${meta.unit}`
                        : '—'}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          <p className="text-center text-xs text-muted-foreground">
            Click a wheel or the body for details
          </p>
        )}
      </CardContent>
    </Card>
  );
}