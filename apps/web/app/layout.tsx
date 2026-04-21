import type { ReactNode } from "react";
import { YurbrainClientProvider } from "@yurbrain/client";
import { WebNhostProvider } from "../src/nhost/provider";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <WebNhostProvider>
          <YurbrainClientProvider options={{ transport: "nhost" }}>
            {children}
          </YurbrainClientProvider>
        </WebNhostProvider>
      </body>
    </html>
  );
}
