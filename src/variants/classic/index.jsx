import React, { useState } from "react";

import RecordPlayer from "./RecordPlayer";
import Vinyl from "../../components/Vinyl";
import "./classic.css";

// The site as it originally shipped: a flat top-down turntable with the three
// records laid out above it. Kept intact as the baseline the other variants are
// measured against.
const ClassicStage = ({ records, loaded, onTapLoad, onDropLoad, onEject, onEjectStart, audio }) => {
  const [isDragging, setIsDragging] = useState(false);

  return (
    <>
      <div className="animated-background"></div>

      <div className={`app-container ${isDragging ? "dragging-active" : ""}`}>
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
                onSelect={onTapLoad}
              />
              <span className="vinyl-hint">{record.title}</span>
            </div>
          ))}
        </div>

        <RecordPlayer
          loaded={loaded}
          onLoad={onDropLoad}
          onEjectComplete={onEject}
          onEjectStart={onEjectStart}
          audio={audio}
        />
      </div>
    </>
  );
};

export default ClassicStage;
