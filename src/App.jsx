import React, { useState, useCallback, useLayoutEffect, useRef } from "react";

import Stage from "./variants/studiocrate";
import { records } from "./records";
import { isCoarsePointer } from "./pointer";
import { useTurntableAudio } from "./audio/useTurntableAudio";
import "./App.css";

// App owns what is on the player and what is coming out of the speakers; the
// Stage owns everything you can see. The split is what let the site try on six
// different looks without touching playback -- see src/variants/stageProps.js
// for the contract, which is still the seam even now that Studio Crate is the
// only look left.
const App = () => {
  // The single source of truth for what's on the player.
  // { record, source: "tap", fromRect } -- fromRect is where the sleeve was
  // when it was pulled, so a Stage can fly the record in from there.
  const [loaded, setLoaded] = useState(null);

  const audio = useTurntableAudio();
  const lastStartedRef = useRef(null);

  // Playback starts here rather than inside the Stage, and this stays a
  // *layout* effect. React flushes discrete input events (click, touchend)
  // synchronously, so a layout effect scheduled by one still runs inside the
  // browser's user-activation window; a passive effect would land after it had
  // expired and iOS would refuse to play.
  useLayoutEffect(() => {
    if (!loaded) {
      lastStartedRef.current = null;
      return;
    }
    // Guards against a re-render with the same `loaded` object restarting the
    // track under a Stage that re-creates its callbacks.
    if (lastStartedRef.current === loaded) return;
    lastStartedRef.current = loaded;
    audio.load(loaded.record);
  }, [loaded, audio]);

  const onTapLoad = useCallback((record, fromRect) => {
    setLoaded((prev) =>
      prev?.record.id === record.id ? prev : { record, source: "tap", fromRect }
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

  return (
    <Stage
      records={records}
      loaded={loaded}
      onTapLoad={onTapLoad}
      onEject={onEject}
      onEjectStart={onEjectStart}
      audio={audio}
      isCoarsePointer={isCoarsePointer}
    />
  );
};

export default App;
