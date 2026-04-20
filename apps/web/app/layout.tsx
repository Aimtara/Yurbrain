import type { ReactNode } from "react";
import { YurbrainClientProvider } from "../src/providers/YurbrainClientProvider";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <YurbrainClientProvider>{children}</YurbrainClientProvider>
      </body>
    </html>
  );
}
