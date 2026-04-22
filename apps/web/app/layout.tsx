import type { ReactNode } from "react";
import { YurbrainClientProvider } from "@yurbrain/client";
import { NhostProvider } from "@nhost/nextjs";
import { NhostClient } from "@nhost/nhost-js";

// Initialize the local client using your .env.local variables
const nhost = new NhostClient({
  authUrl: process.env.NEXT_PUBLIC_NHOST_AUTH_URL,
  graphqlUrl: process.env.NEXT_PUBLIC_NHOST_GRAPHQL_URL,
  functionsUrl: process.env.NEXT_PUBLIC_NHOST_FUNCTIONS_URL
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <NhostProvider nhost={nhost}>
          <YurbrainClientProvider options={{ transport: "nhost" }}>
            {children}
          </YurbrainClientProvider>
        </NhostProvider>
      </body>
    </html>
  );
}
