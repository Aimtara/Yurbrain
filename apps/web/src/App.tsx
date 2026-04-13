import { useState } from "react";

const tabs = ["Brain", "Focus", "Time", "Me"] as const;

export function App() {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("Brain");

  return (
    <main>
      <h1>Yurbrain</h1>
      <nav aria-label="Primary tabs">
        {tabs.map((tab) => (
          <button key={tab} type="button" onClick={() => setActiveTab(tab)} aria-pressed={activeTab === tab}>
            {tab}
          </button>
        ))}
      </nav>

      <section>
        <h2>{activeTab}</h2>
        <p>Clean/focus mode is enabled by default.</p>
      </section>

      <footer>
        <label htmlFor="capture">CaptureComposer</label>
        <textarea id="capture" placeholder="Capture a note..." rows={3} />
      </footer>
    </main>
  );
}
