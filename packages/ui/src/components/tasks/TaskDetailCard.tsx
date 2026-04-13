import React from "react";

export function TaskDetailCard({ title, status }: { title: string; status: string }) {
  return <div>{title} · {status}</div>;
}
