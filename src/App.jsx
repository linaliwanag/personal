import React, { useState, useCallback } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { TouchBackend } from "react-dnd-touch-backend";

import RecordPlayer from "./components/RecordPlayer";
import Vinyl from "./components/Vinyl";
import RecordDragLayer from "./components/RecordDragLayer";
import { records } from "./records";
import { isCoarsePointer } from "./pointer";
import './App.css'

// delayTouchStart is what lets tap-to-load and drag-to-load share the same
// record. A quick tap finishes well inside the delay, so no drag ever starts
// and the click handler runs untouched; holding past it begins a drag instead.
const dndBackend = isCoarsePointer ? TouchBackend : HTML5Backend;
const dndOptions = isCoarsePointer
  ? { delayTouchStart: 200, ignoreContextMenu: true, enableMouseEvents: false }
  : {};

const App = () => {
  const [isDragging, setIsDragging] = useState(false);
  // The single source of truth for what's on the player.
  // { record, source: "tap" | "drop", fromRect? } -- `source` picks which
  // arrival animation plays, `fromRect` is where a tapped record flies in from.
  const [loaded, setLoaded] = useState(null);

  const loadByTap = useCallback((record, fromRect) => {
    setLoaded((prev) =>
      prev?.record.id === record.id ? prev : { record, source: "tap", fromRect }
    );
  }, []);

  const loadByDrop = useCallback((record) => {
    setLoaded((prev) =>
      prev?.record.id === record.id ? prev : { record, source: "drop" }
    );
  }, []);

  // Fired once the ejected record has landed back in its menu slot, not when
  // eject is pressed -- the record has to stay mounted for the whole flight.
  const handleEjectComplete = useCallback(() => setLoaded(null), []);

  return (
    <DndProvider backend={dndBackend} options={dndOptions}>
      <div className="animated-background"></div>
      {isCoarsePointer && <RecordDragLayer />}

      <div className={`app-container ${isDragging ? 'dragging-active' : ''}`}>
        <header>
          <h1 className="main-title">Hi there, I'm Paulina!</h1>
          <p className="subtitle">Tap or drag a record onto the player to learn more about me!</p>
        </header>

        <div className="vinyl-menu">
          {records.map((record) => (
            <div
              key={record.id}
              className="vinyl-wrapper"
              onDragStart={() => setIsDragging(true)}
              onDragEnd={() => setIsDragging(false)}
            >
              <Vinyl
                record={record}
                isOnPlayer={loaded?.record.id === record.id}
                onSelect={loadByTap}
              />
              <span className="vinyl-hint">{record.title}</span>
            </div>
          ))}
        </div>

        <RecordPlayer
          loaded={loaded}
          onLoad={loadByDrop}
          onEjectComplete={handleEjectComplete}
        />
      </div>
    </DndProvider>
  );
};

export default App;
