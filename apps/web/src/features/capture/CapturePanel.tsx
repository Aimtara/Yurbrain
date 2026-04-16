import { CaptureComposer, type CaptureSubmitIntent } from "@yurbrain/ui";

type CapturePanelProps = {
  captureLoading: boolean;
  captureStatusNotice: string;
  captureSheetOpen: boolean;
  captureDraft: string;
  captureError: string;
  captureSuccessNotice: string;
  onOpenTimeHome: () => void;
  onOpenMe: () => void;
  onOpenCaptureSheet: () => void;
  onCaptureDraftChange: (value: string) => void;
  onCaptureSubmit: (intent: CaptureSubmitIntent) => void;
  onCaptureClose: () => void;
  onVoiceCaptureStub: () => void;
};

export function CapturePanel({
  captureLoading,
  captureStatusNotice,
  captureSheetOpen,
  captureDraft,
  captureError,
  captureSuccessNotice,
  onOpenTimeHome,
  onOpenMe,
  onOpenCaptureSheet,
  onCaptureDraftChange,
  onCaptureSubmit,
  onCaptureClose,
  onVoiceCaptureStub
}: CapturePanelProps) {
  return (
    <div style={{ display: "grid", gap: "12px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
        <h2 style={{ margin: 0, fontSize: "22px", lineHeight: "28px" }}>Capture</h2>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button type="button" onClick={onOpenTimeHome}>
            Open Time home
          </button>
          <button type="button" onClick={onOpenMe}>
            Open Me
          </button>
          <button type="button" onClick={onOpenCaptureSheet}>
            Open capture sheet
          </button>
        </div>
      </div>
      <p style={{ margin: 0, color: "#475569" }}>Capture first, then choose Save, Save + Plan, or Save + Remind Later.</p>
      {captureLoading ? <p style={{ margin: 0 }}>Saving capture...</p> : null}
      {captureStatusNotice ? <p style={{ margin: 0 }}>{captureStatusNotice}</p> : null}
      <CaptureComposer
        isOpen={captureSheetOpen}
        value={captureDraft}
        onChange={onCaptureDraftChange}
        onSubmit={onCaptureSubmit}
        onClose={onCaptureClose}
        isSubmitting={captureLoading}
        errorMessage={captureError}
        statusMessage={captureStatusNotice}
        successMessage={captureSuccessNotice}
        onVoiceStub={onVoiceCaptureStub}
      />
    </div>
  );
}
