'use client';
import { useTelemetry } from '@/hooks/useTelemetry';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { fetchHealth, API_BASE_URL } from '../lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

import { SensorTable } from '@/components/ui/SensorTable';
import { VitalsPanel } from '@/components/ui/VitalsPanel';
import { Diagram } from '@/components/ui/Diagram';

export default function Page() {
  // 'checking' → initial state; 'ok' or 'unhealthy' after first health check.
  const [healthStatus, setHealthStatus] = useState<'ok' | 'unhealthy' | 'checking'>('checking');
  const [healthError, setHealthError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function checkHealth() {
      try {
        await fetchHealth();
        if (cancelled) return;
        setHealthStatus('ok');
        setHealthError(null);
      } catch (e: unknown) {
        if (cancelled) return;
        // API not reachable or reporting unhealthy.
        setHealthStatus('unhealthy');
        setHealthError(e instanceof Error ? e.message : 'Failed to reach API');
      }
    }

    // Poll /health, but only start the next check after the previous one completes,
    // so we don't accumulate overlapping requests when the API is slow/unreachable.
    (async () => {
      while (!cancelled) {
        await checkHealth();
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const { metadataMap, latestReadings, outOfRangeCounts, status } = useTelemetry();
  

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-background/80 px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Image src="/logo-darkmode.svg" alt="Spyder" width={32} height={32} />
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Spyder Telemetry</h1>
              <p className="text-xs text-muted-foreground">
                Vehicle Analytics Fullstack Assessment
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
              API base: <span className="font-mono">{API_BASE_URL}</span>
            </div>
            <div
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                healthStatus === 'ok'
                  ? 'bg-green-500/20 text-green-700 dark:text-green-400'
                  : healthStatus === 'checking'
                    ? 'bg-muted text-muted-foreground'
                    : 'bg-destructive/20 text-destructive'
              }`}
            >
              {healthStatus === 'ok'
                ? 'API connected'
                : healthStatus === 'checking'
                  ? 'Checking…'
                  : 'API unreachable'}
            </div>
            <div className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
              Stream: {status}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8">
        {healthError && healthStatus === 'unhealthy' && (
          <Card className="border-destructive/40 bg-destructive/10 text-destructive-foreground">
            <CardHeader className="py-4">
              <CardTitle className="text-sm">Cannot reach API</CardTitle>
              <CardDescription className="text-xs text-destructive-foreground/80">
                {healthError}
                {healthError.includes('fetch') || healthError.includes('Failed to reach')
                  ? ` Ensure the API is running at ${API_BASE_URL} (e.g. va-fullstack-assessment: docker compose up, or cd api && npm run dev).`
                  : ''}
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {/* <Card className="border-muted">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
              Dashboard data
            </CardTitle>
            <CardDescription>
              This skeleton only calls <code className="rounded bg-muted px-1 py-0.5 text-[10px]">GET /health</code>.
              Implement consumption of your API’s <strong>metadata</strong> and <strong>data</strong> routes (designed
              in the API section) to populate the dashboard: resolve sensorId → sensorName and unit, and display
              latest telemetry (and optionally a live stream). Use <code className="rounded bg-muted px-1 py-0.5 text-[10px]">src/lib/api-client.ts</code> to add
              fetch functions for your endpoints, then wire them up here.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Once connected, show multiple sensors, a primary metric, sensible formatting (decimal places, units),
              and consider status (e.g. colours for safe/unsafe ranges). Use shadcn/ui for layout and components.
            </p>
          </CardContent>
        </Card> */}

        <div className="grid gap-6 items-start lg:grid-cols-[280px_1fr]">
          <VitalsPanel metadataMap={metadataMap} latestReadings={latestReadings} />
           <Diagram metadataMap={metadataMap} latestReadings={latestReadings} />
        </div>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold tracking-tight">All sensors</h2>
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <div className="overflow-x-auto rounded-xl border border-border bg-card">
              {latestReadings.size === 0 ? (
                <div className="flex min-h-[120px] items-center justify-center p-6 text-center text-sm text-muted-foreground">
                  Waiting for sensor data…
                </div>
              ) : (
                <SensorTable
                  metadataMap={metadataMap}
                  latestReadings={latestReadings}
                  outOfRangeCounts={outOfRangeCounts}
                />
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
