import type { PropsWithChildren } from "react";
import { NhostProvider as SharedNhostProvider } from "@nhost/react";

import { nhost } from "../lib/nhost";

export function NhostProvider({ children }: PropsWithChildren) {
  return <SharedNhostProvider nhost={nhost as never}>{children}</SharedNhostProvider>;
}
