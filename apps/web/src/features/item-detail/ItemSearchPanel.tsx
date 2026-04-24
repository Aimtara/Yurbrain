"use client";

import type { BrainItemDto } from "../shared/types";

type ItemSearchPanelProps = {
  items: BrainItemDto[];
  query: string;
  tag: string;
  type: "all" | BrainItemDto["type"];
  status: "all" | BrainItemDto["status"];
  processingStatus: "all" | "processed" | "pending";
  createdFrom: string;
  createdTo: string;
  loading: boolean;
  error: string;
  semanticSearchNotice: string;
  emptyStateMessage: string;
  onQueryChange: (value: string) => void;
  onTagChange: (value: string) => void;
  onTypeChange: (value: "all" | BrainItemDto["type"]) => void;
  onStatusChange: (value: "all" | BrainItemDto["status"]) => void;
  onProcessingStatusChange: (value: "all" | "processed" | "pending") => void;
  onCreatedFromChange: (value: string) => void;
  onCreatedToChange: (value: string) => void;
  onApply: () => void;
  onReset: () => void;
  onSelectItem: (itemId: string) => void;
};

function hasActiveFilters(props: ItemSearchPanelProps): boolean {
  return Boolean(
    props.query.trim() ||
      props.tag.trim() ||
      props.type !== "all" ||
      props.status !== "all" ||
      props.processingStatus !== "all" ||
      props.createdFrom ||
      props.createdTo
  );
}

export function ItemSearchPanel(props: ItemSearchPanelProps) {
  const activeFilters = hasActiveFilters(props);

  return (
    <section
      style={{
        borderRadius: "14px",
        border: "1px solid #dbe4ef",
        background: "#ffffff",
        padding: "12px",
        display: "grid",
        gap: "10px"
      }}
      aria-label="Brain item keyword search"
    >
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "8px", flexWrap: "wrap" }}>
        <div>
          <h3 style={{ margin: 0, fontSize: "16px", lineHeight: "22px" }}>Search captures</h3>
          <p style={{ margin: "4px 0 0", color: "#475569", fontSize: "13px" }}>{props.semanticSearchNotice}</p>
        </div>
        <p style={{ margin: 0, color: "#334155", fontSize: "13px" }}>{props.items.length} results</p>
      </div>

      <div style={{ display: "grid", gap: "8px" }}>
        <label style={{ display: "grid", gap: "4px" }}>
          <span style={{ color: "#334155", fontWeight: 600, fontSize: "13px" }}>Keyword</span>
          <input
            value={props.query}
            onChange={(event) => props.onQueryChange(event.target.value)}
            placeholder="Search title, raw content, processed artifacts, source URL, tag"
            style={{
              borderRadius: "10px",
              border: "1px solid #cbd5e1",
              padding: "8px 10px",
              fontSize: "14px"
            }}
          />
        </label>

        <div style={{ display: "grid", gap: "8px", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
          <label style={{ display: "grid", gap: "4px" }}>
            <span style={{ color: "#334155", fontWeight: 600, fontSize: "13px" }}>Type</span>
            <select
              value={props.type}
              onChange={(event) => props.onTypeChange(event.target.value as "all" | BrainItemDto["type"])}
              style={{ borderRadius: "10px", border: "1px solid #cbd5e1", padding: "8px 10px" }}
            >
              <option value="all">All</option>
              <option value="note">Note</option>
              <option value="link">Link</option>
              <option value="idea">Idea</option>
              <option value="quote">Quote</option>
              <option value="file">File</option>
            </select>
          </label>

          <label style={{ display: "grid", gap: "4px" }}>
            <span style={{ color: "#334155", fontWeight: 600, fontSize: "13px" }}>Status</span>
            <select
              value={props.status}
              onChange={(event) => props.onStatusChange(event.target.value as "all" | BrainItemDto["status"])}
              style={{ borderRadius: "10px", border: "1px solid #cbd5e1", padding: "8px 10px" }}
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </label>

          <label style={{ display: "grid", gap: "4px" }}>
            <span style={{ color: "#334155", fontWeight: 600, fontSize: "13px" }}>Processing</span>
            <select
              value={props.processingStatus}
              onChange={(event) =>
                props.onProcessingStatusChange(event.target.value as "all" | "processed" | "pending")
              }
              style={{ borderRadius: "10px", border: "1px solid #cbd5e1", padding: "8px 10px" }}
            >
              <option value="all">All</option>
              <option value="processed">Processed</option>
              <option value="pending">Pending</option>
            </select>
          </label>
        </div>

        <div style={{ display: "grid", gap: "8px", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
          <label style={{ display: "grid", gap: "4px" }}>
            <span style={{ color: "#334155", fontWeight: 600, fontSize: "13px" }}>Tag</span>
            <input
              value={props.tag}
              onChange={(event) => props.onTagChange(event.target.value)}
              placeholder="topic or classification label"
              style={{ borderRadius: "10px", border: "1px solid #cbd5e1", padding: "8px 10px" }}
            />
          </label>

          <label style={{ display: "grid", gap: "4px" }}>
            <span style={{ color: "#334155", fontWeight: 600, fontSize: "13px" }}>Created from</span>
            <input
              type="date"
              value={props.createdFrom}
              onChange={(event) => props.onCreatedFromChange(event.target.value)}
              style={{ borderRadius: "10px", border: "1px solid #cbd5e1", padding: "8px 10px" }}
            />
          </label>

          <label style={{ display: "grid", gap: "4px" }}>
            <span style={{ color: "#334155", fontWeight: 600, fontSize: "13px" }}>Created to</span>
            <input
              type="date"
              value={props.createdTo}
              onChange={(event) => props.onCreatedToChange(event.target.value)}
              style={{ borderRadius: "10px", border: "1px solid #cbd5e1", padding: "8px 10px" }}
            />
          </label>
        </div>
      </div>

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <button type="button" onClick={props.onApply} disabled={props.loading}>
          {props.loading ? "Searching..." : "Search"}
        </button>
        <button
          type="button"
          onClick={props.onReset}
          disabled={props.loading || !activeFilters}
        >
          Clear
        </button>
      </div>
      {props.error ? <p style={{ margin: 0, color: "#b91c1c", fontSize: "13px" }}>{props.error}</p> : null}
      {props.items.length === 0 ? (
        <p style={{ margin: 0, color: "#475569", fontSize: "13px" }}>{props.emptyStateMessage}</p>
      ) : (
        <ul style={{ margin: 0, paddingLeft: "20px", display: "grid", gap: "6px" }}>
          {props.items.slice(0, 10).map((item) => (
            <li key={item.id}>
              <button type="button" onClick={() => props.onSelectItem(item.id)} style={{ textAlign: "left" }}>
                {item.title}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
