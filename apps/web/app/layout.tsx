import { NhostProvider } from '@nhost/nextjs';
import { NhostClient } from '@nhost/nhost-js';

import type { ReactNode } from "react";
import { YurbrainClientProvider } from "@yurbrain/client";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <YurbrainClientProvider options={{ transport: "nhost" }}>
          {children}
        </YurbrainClientProvider>
      </body>
    </html>
  );
}
