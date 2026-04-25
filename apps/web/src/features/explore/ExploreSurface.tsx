import { ExplorePrototypeScreen } from "@yurbrain/ui";

import type { ConnectionCandidateDto, ConnectionMode } from "./types";

type ExploreSurfaceProps = {
  sourceCards: Array<{ id: string; title: string; preview: string; meta?: string }>;
  selectedSourceCards: Array<{ id: string; title: string; preview: string; meta?: string }>;
  selectedSourceIds: string[];
  mode: ConnectionMode;
  candidates: ConnectionCandidateDto[];
  selectedCandidate: ConnectionCandidateDto | null;
  loading: boolean;
  saving: boolean;
  notice: string;
  error: string;
  onBackToFeed: () => void;
  onToggleSource: (sourceId: string) => void;
  onRemoveSource: (sourceId: string) => void;
  onModeChange: (mode: ConnectionMode) => void;
  onPreview: () => void;
  onSelectCandidate: (candidate: ConnectionCandidateDto) => void;
  onSave: (candidate: ConnectionCandidateDto) => void;
  onTryAnotherAngle: () => void;
};

export function ExploreSurface({
  sourceCards,
  selectedSourceCards,
  selectedSourceIds,
  mode,
  candidates,
  selectedCandidate,
  loading,
  saving,
  notice,
  error,
  onBackToFeed,
  onToggleSource,
  onRemoveSource,
  onModeChange,
  onPreview,
  onSelectCandidate,
  onSave,
  onTryAnotherAngle
}: ExploreSurfaceProps) {
  const selectedCandidateIndex = Math.max(0, candidates.findIndex((candidate) => candidate === selectedCandidate));

  return (
    <ExplorePrototypeScreen
      sourceCards={[...selectedSourceCards, ...sourceCards].map((card) => ({
        id: card.id,
        title: card.title,
        preview: card.preview,
        selected: selectedSourceIds.includes(card.id)
      }))}
      selectedCount={selectedSourceIds.length}
      mode={mode}
      candidates={candidates}
      selectedCandidateIndex={selectedCandidateIndex < 0 ? 0 : selectedCandidateIndex}
      loading={loading}
      saving={saving}
      notice={notice}
      errorMessage={error}
      onBackToFocus={onBackToFeed}
      onToggleCard={onToggleSource}
      onModeChange={onModeChange}
      onPreview={onPreview}
      onSelectCandidate={(index) => {
        const candidate = candidates[index];
        if (candidate) onSelectCandidate(candidate);
      }}
      onSave={() => {
        const candidate = selectedCandidate ?? candidates[0];
        if (candidate) onSave(candidate);
      }}
      onPlan={() => {
        const candidate = selectedCandidate ?? candidates[0];
        if (candidate) onSave(candidate);
      }}
      onDismiss={onBackToFeed}
    />
  );
}
