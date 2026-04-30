import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const WEB_ROOT = path.resolve(process.cwd(), "../..", "apps/web");

function readWebFile(relativePath: string): string {
  return readFileSync(path.resolve(WEB_ROOT, relativePath), "utf8");
}

test("web production shell preserves the continuity-first surface map", () => {
  const pageSource = readWebFile("app/page.tsx");
  const shellStateSource = readWebFile("src/features/shell/useAppShellState.ts");
  const layoutSource = readWebFile("app/layout.tsx");

  assert.match(layoutSource, /YurbrainClientProvider/);
  assert.match(layoutSource, /transport: "nhost"/);

  assert.match(shellStateSource, /useState<Surface>\("feed"\)/);
  assert.match(pageSource, /FocusFeedSurface/);
  assert.match(pageSource, /ItemDetailSurface/);
  assert.match(pageSource, /CapturePanel/);
  assert.match(pageSource, /SessionSurface/);
  assert.match(pageSource, /TimeSurface/);
  assert.match(pageSource, /ExploreSurface/);
});

test("web Focus Feed keeps calm capture and downstream conversion language", () => {
  const focusFeedSource = readWebFile("src/features/feed/FocusFeedSurface.tsx");
  const captureSource = readWebFile("src/features/capture/CapturePanel.tsx");
  const captureComposerSource = readFileSync(
    path.resolve(WEB_ROOT, "../..", "packages/ui/src/components/capture/CaptureComposer.tsx"),
    "utf8"
  );
  const itemDetailSource = readWebFile("src/features/item-detail/ItemDetailSurface.tsx");

  assert.match(focusFeedSource, /title="Focus Feed"/);
  assert.match(focusFeedSource, /Find saved thoughts again and continue when one is ready\./);
  assert.match(captureSource, /Stage 1: save it now, find it again in Focus Feed, and continue later\. Planning appears when a saved item is ready for action\./);
  assert.match(captureComposerSource, /Save it now\. Yurbrain will help you find it again and continue later\./);
  assert.match(captureComposerSource, /Save \+ Plan if clear/);
  assert.match(captureSource, /Saving capture/);
  assert.match(itemDetailSource, /onAddComment/);
  assert.match(itemDetailSource, /onAskYurbrain/);
  assert.match(itemDetailSource, /onConvertCommentToTask/);
});

test("web launch scope does not expose production attachment upload claims", () => {
  const captureSource = readWebFile("src/features/capture/CapturePanel.tsx");
  const captureComposerSource = readFileSync(
    path.resolve(WEB_ROOT, "../..", "packages/ui/src/components/capture/CaptureComposer.tsx"),
    "utf8"
  );
  const pageSource = readWebFile("app/page.tsx");

  assert.doesNotMatch(captureSource, /upload file/i);
  assert.doesNotMatch(pageSource, /upload attachment/i);
  assert.match(captureSource, /productionMode/);
  assert.match(captureComposerSource, /Image URL/);
  assert.match(captureComposerSource, /native uploads are not part of the current production scope/);
});
