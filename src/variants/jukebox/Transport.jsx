import React, { useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlay, faPause, faStop, faEject } from "@fortawesome/free-solid-svg-icons";

import { formatTime } from "../../audio/useTurntableAudio";

// The cabinet's control panel: three chunky mechanical buttons and a scrubbable
// meter. Nothing here is variant-specific cleverness -- it is the same transport
// every variant owns, wearing chrome.
const Transport = ({ audio, record, onEject, busy }) => {
  const barRef = useRef(null);
  const draggingRef = useRef(false);

  // getBoundingClientRect is taken *after* the cabinet's fit scaling and 3D
  // tilt, so the fraction it yields is already in screen terms -- no need to
  // know what scale the cabinet happens to be drawn at. The parallax tilt is
  // capped at a few degrees, which costs the measurement well under a pixel.
  const seekAt = (clientX) => {
    const rect = barRef.current?.getBoundingClientRect();
    if (!rect?.width) return;
    audio.seek((clientX - rect.left) / rect.width);
  };

  const onPointerDown = (event) => {
    if (!record) return;
    draggingRef.current = true;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    seekAt(event.clientX);
  };

  const onPointerMove = (event) => {
    if (draggingRef.current) seekAt(event.clientX);
  };

  const endScrub = (event) => {
    draggingRef.current = false;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  };

  return (
    <div className="jb-transport">
      <div className="jb-buttons">
        <button
          type="button"
          className={`jb-btn ${audio.isPlaying ? "is-lit" : ""}`}
          onClick={audio.toggle}
          disabled={!record}
        >
          <FontAwesomeIcon icon={audio.isPlaying ? faPause : faPlay} />
          <span>{audio.isPlaying ? "Pause" : "Play"}</span>
        </button>
        <button type="button" className="jb-btn" onClick={audio.stop} disabled={!record}>
          <FontAwesomeIcon icon={faStop} />
          <span>Stop</span>
        </button>
        <button
          type="button"
          className="jb-btn jb-btn--eject"
          onClick={onEject}
          disabled={!record || busy}
        >
          <FontAwesomeIcon icon={faEject} />
          <span>Eject</span>
        </button>
      </div>

      <div className="jb-meter">
        <div
          ref={barRef}
          className={`jb-track ${record ? "" : "is-dead"}`}
          role="slider"
          aria-label="Seek"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(audio.progress)}
          tabIndex={record ? 0 : -1}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endScrub}
          onPointerCancel={endScrub}
          onKeyDown={(event) => {
            if (!record || !audio.duration) return;
            const step = event.key === "ArrowLeft" ? -5 : event.key === "ArrowRight" ? 5 : 0;
            if (!step) return;
            event.preventDefault();
            audio.seek((audio.progress + step) / 100);
          }}
        >
          <div className="jb-track-fill" style={{ transform: `scaleX(${audio.progress / 100})` }} />
          <div className="jb-track-knob" style={{ left: `${audio.progress}%` }} />
        </div>
        <div className="jb-times">
          <span>{formatTime(audio.progress, audio.duration)}</span>
          <span className="jb-times-label">{record ? record.trackLabel : "no record"}</span>
          <span>{formatTime(100, audio.duration)}</span>
        </div>
      </div>
    </div>
  );
};

export default Transport;
