import type { ReactNode } from "react";
import { YurbrainClientProvider } from "@yurbrain/client";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <YurbrainClientProvider>{children}</YurbrainClientProvider>
      </body>
    </html>
  );
}
