import React, { Suspense, useState, useCallback, useLayoutEffect, useRef } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { TouchBackend } from "react-dnd-touch-backend";

import RecordDragLayer from "./components/RecordDragLayer";
import VariantSwitcher from "./components/VariantSwitcher";
import { records } from "./records";
import { isCoarsePointer } from "./pointer";
import { useTurntableAudio } from "./audio/useTurntableAudio";
import { variants, findVariant, DEFAULT_VARIANT_ID } from "./variants/registry";
import './App.css'

// delayTouchStart is what lets tap-to-load and drag-to-load share the same
// record. A quick tap finishes well inside the delay, so no drag ever starts
// and the click handler runs untouched; holding past it begins a drag instead.
const dndBackend = isCoarsePointer ? TouchBackend : HTML5Backend;
const dndOptions = isCoarsePointer
  ? { delayTouchStart: 200, ignoreContextMenu: true, enableMouseEvents: false }
  : {};

const VARIANT_STORAGE_KEY = "recordPlayerVariant";

// Read once, lazily, so the first paint is already on the reader's chosen
// variant rather than flashing the default and then swapping.
const initialVariantId = () => {
  try {
    const fromQuery = new URLSearchParams(window.location.search).get("variant");
    const stored = fromQuery || window.localStorage.getItem(VARIANT_STORAGE_KEY);
    return findVariant(stored).id;
  } catch {
    // Private-mode Safari throws on localStorage access rather than returning
    // null. A missing preference is not worth failing the render over.
    return DEFAULT_VARIANT_ID;
  }
};

const App = () => {
  const [variantId, setVariantId] = useState(initialVariantId);
  // The single source of truth for what's on the player.
  // { record, source: "tap" | "drop", fromRect? } -- `source` picks which
  // arrival animation plays, `fromRect` is where a tapped record flies in from.
  const [loaded, setLoaded] = useState(null);

  const audio = useTurntableAudio();
  const lastStartedRef = useRef(null);

  // Playback starts here rather than inside a variant, so every variant gets
  // the same behaviour for free -- and so this stays a *layout* effect. React
  // flushes discrete input events (click, touchend) synchronously, so a layout
  // effect scheduled by one still runs inside the browser's user-activation
  // window; a passive effect would land after it had expired and iOS would
  // refuse to play.
  useLayoutEffect(() => {
    if (!loaded) {
      lastStartedRef.current = null;
      return;
    }
    // Guards against a re-render with the same `loaded` object restarting the
    // track under a variant that re-creates its callbacks.
    if (lastStartedRef.current === loaded) return;
    lastStartedRef.current = loaded;
    audio.load(loaded.record);
  }, [loaded, audio]);

  const onTapLoad = useCallback((record, fromRect) => {
    setLoaded((prev) =>
      prev?.record.id === record.id ? prev : { record, source: "tap", fromRect }
    );
  }, []);

  const onDropLoad = useCallback((record) => {
    setLoaded((prev) =>
      prev?.record.id === record.id ? prev : { record, source: "drop" }
    );
  }, []);

  // Split in two because the sound and the picture end at different times: the
  // audio should fade the instant eject is pressed, but the record stays
  // mounted until it has finished flying home.
  const onEjectStart = useCallback(() => audio.unload(), [audio]);
  const onEject = useCallback(() => {
    setLoaded(null);
    audio.reset();
  }, [audio]);

  // Switching variants tears the player down first. The arrival and eject
  // animations are driven by changes to `loaded`, so handing a fresh Stage a
  // record that is already on the player would mount it mid-flight with no
  // animation to finish -- and leave the previous variant's track playing under
  // a UI that has no transport controls for it.
  const changeVariant = useCallback((id) => {
    setLoaded(null);
    audio.unload();
    audio.reset();
    setVariantId(id);
    try {
      window.localStorage.setItem(VARIANT_STORAGE_KEY, id);
    } catch {
      // Preference just won't persist. Not worth interrupting the switch.
    }
  }, [audio]);

  const { id: activeId, Stage } = findVariant(variantId);

  return (
    <DndProvider backend={dndBackend} options={dndOptions}>
      {isCoarsePointer && <RecordDragLayer />}

      <VariantSwitcher variants={variants} activeId={activeId} onChange={changeVariant} />

      <Suspense fallback={<div className="variant-loading">Loading…</div>}>
        {/* Keyed on the variant so switching remounts rather than trying to
            reconcile two completely different scene graphs. */}
        <Stage
          key={activeId}
          records={records}
          loaded={loaded}
          onTapLoad={onTapLoad}
          onDropLoad={onDropLoad}
          onEject={onEject}
          onEjectStart={onEjectStart}
          audio={audio}
          isCoarsePointer={isCoarsePointer}
        />
      </Suspense>
    </DndProvider>
  );
};

export default App;
