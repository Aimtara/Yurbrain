import React from "react";

export function BrainItemDetail({ title, rawContent }: { title: string; rawContent: string }) {
  return (
    <section>
      <h2>{title}</h2>
      <p>{rawContent}</p>
    </section>
  );
}
