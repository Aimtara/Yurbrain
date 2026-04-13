import React from "react";

export function ActiveSessionScreen({ state }: { state: string }) {
  return <section>Session: {state}</section>;
}
