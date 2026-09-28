import type { ReactNode } from 'react';
import './globals.css';
import { Inter  } from "next/font/google";
import { cn } from "@/lib/utils";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

export const metadata = {
  title: 'Vehicle Analytics – Telemetry Dashboard',
  description: 'Frontend assessment for the Vehicle Analytics technical assessment'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={cn("dark", "font-sans", inter.variable)}>
      <body>{children}</body>
    </html>
  );
}

