import React, { useState, useEffect, useRef } from "react";
import { useDrag, useDrop } from "react-dnd";
import { getVinylColor } from "../vinylColors";
import "./RecordPlayer.css";

import Content from "./Content";

// How long the record takes to travel back to its slot in the menu. The button
// eject gets a little longer because it also plays the lift-off beat first.
const EJECT_FLIGHT_MS = 560;
const DRAG_FLIGHT_MS = 420;

const RecordPlayer = ({ onVinylChange, currentVinyl }) => {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [currentTrackTitle, setCurrentTrackTitle] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [trackProgress, setTrackProgress] = useState(0);
  const [trackDuration, setTrackDuration] = useState(0);
  const [nowPlaying, setNowPlaying] = useState("No track selected");
  const [dropActive, setDropActive] = useState(false);
  const [vinylOnPlayer, setVinylOnPlayer] = useState(null);
  const [isReturning, setIsReturning] = useState(false);
  const [isEntering, setIsEntering] = useState(false);
  const audioRef = useRef(null);
  const fadeIntervalRef = useRef(null);
  const vinylElRef = useRef(null);
  const isReturningRef = useRef(false);
  const flightTimeoutRef = useRef(null);

  useEffect(() => {
    if (currentTrack) {
      if (audioRef.current) {
        audioRef.current.pause();
      }

      const absolutePath = window.location.origin + currentTrack;
      const newAudio = new Audio(absolutePath);

      newAudio.onended = () => {
        setIsPlaying(false);
        setTrackProgress(0);
        setNowPlaying("No track selected");
      };

      newAudio.onloadedmetadata = () => {
        newAudio.volume = 0;
        setTrackDuration(newAudio.duration);
        fadeIn(newAudio, 0.05);
        newAudio.play().catch(error => console.error("Audio play failed:", error));
        setIsPlaying(true);
      };

      // Add timeupdate event listener for progress bar
      newAudio.ontimeupdate = () => {
        if (newAudio.duration) {
          setTrackProgress((newAudio.currentTime / newAudio.duration) * 100);
        }
      };

      audioRef.current = newAudio;

      // Set track name based on title
      setNowPlaying(() => {
        if (currentTrackTitle === "About") return "About Me - Track 1";
        if (currentTrackTitle === "Projects") return "My Projects - Track 2";
        if (currentTrackTitle === "Contact") return "Contact Me - Track 3";
        return "Unknown Track";
      });

    } else {
      setNowPlaying("No track selected");
      setIsPlaying(false);
      setTrackProgress(0);
      setTrackDuration(0);
    }
  }, [currentTrack, currentTrackTitle]);

  useEffect(() => {
    if (!vinylOnPlayer) return;
    // Scoped to its own class + timed removal (rather than left as a permanent
    // property of .vinyl-on-player) so it can't restart later just because some
    // other class (like .returning) toggles on the same element -- CSS animations
    // take priority over transitions on the same property and will hijack them.
    setIsEntering(true);
    const timer = setTimeout(() => setIsEntering(false), 500);
    return () => clearTimeout(timer);
  }, [vinylOnPlayer]);

  useEffect(() => {
    if (!audioRef.current || !audioRef.current.src) return;

    if (isPlaying) {
      audioRef.current.play().catch(error => console.error("Audio play failed:", error));
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying]);

  const fadeIn = (audioElement, step) => {
    if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
    let volume = 0;
    audioElement.volume = 0;
    fadeIntervalRef.current = setInterval(() => {
      if (volume < 0.8) {
        volume = Math.min(volume + step, 0.8);
        audioElement.volume = volume;
      } else {
        clearInterval(fadeIntervalRef.current);
        fadeIntervalRef.current = null;
      }
    }, 100);
  };

  const fadeOut = (audioElement, step, callback) => {
    if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
    let volume = audioElement.volume;
    fadeIntervalRef.current = setInterval(() => {
      if (volume > 0) {
        volume = Math.max(volume - step, 0);
        audioElement.volume = volume;
      } else {
        clearInterval(fadeIntervalRef.current);
        fadeIntervalRef.current = null;
        callback();
      }
    }, 100);
  };

  const handleTrackDrop = (item) => {
    const { filePath, title } = item;
    if (!filePath) {
      console.error("No filePath received! Check Vinyl component.");
      return;
    }

    // Set the vinyl on the player
    setVinylOnPlayer({ title, filePath });
    onVinylChange({ title, filePath });

    // First fade out current track if playing
    if (audioRef.current && audioRef.current.src && !audioRef.current.paused) {
      fadeOut(audioRef.current, 0.1, () => {
        setCurrentTrack(filePath);
        setCurrentTrackTitle(title);
      });
    } else {
      setCurrentTrack(filePath);
      setCurrentTrackTitle(title);
    }

    setDropActive(false);
  };

  const togglePlayPause = () => {
    if (!audioRef.current || !audioRef.current.src) {
      console.warn("Audio source is not set. Cannot play.");
      return;
    }
    setIsPlaying((prev) => !prev);
  };

  const stopAudio = () => {
    if (audioRef.current) {
      fadeOut(audioRef.current, 0.1, () => {
        audioRef.current.currentTime = 0;
        audioRef.current.pause();
        setIsPlaying(false);
        setTrackProgress(0);
      });
    }
  };

  const clearPlayer = () => {
    setCurrentTrack(null);
    setCurrentTrackTitle(null);
    setVinylOnPlayer(null);
    onVinylChange(null);
    setTrackProgress(0);
    setNowPlaying("No track selected");
    setIsReturning(false);
  };

  const stopAudioForEject = () => {
    if (!audioRef.current) return;
    fadeOut(audioRef.current, 0.1, () => {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current.load();
      setIsPlaying(false);
    });
  };

  // Measures the record's home slot in the menu. Returns the delta from the
  // player vinyl's centre to the slot's centre, plus the scale and opacity the
  // slot is *currently rendered at* -- while a record is on the player its menu
  // slot sits there dimmed and shrunk. Landing the flying record on exactly
  // those values means it and the menu slot are pixel-identical at the moment
  // of hand-off, so unmounting one and un-dimming the other is invisible.
  const measureHomeSlot = () => {
    const playerVinylEl = vinylElRef.current;
    const menuVinylEl = vinylOnPlayer
      ? document.querySelector(`.vinyl-record[data-vinyl-title="${CSS.escape(vinylOnPlayer.title)}"]`)
      : null;
    if (!playerVinylEl || !menuVinylEl) return null;

    const playerRect = playerVinylEl.getBoundingClientRect();
    const slotRect = menuVinylEl.getBoundingClientRect();
    // We measure while the record is still spinning, and a rotated square's
    // bounding box is up to ~1.41x its real width -- so the scale has to come
    // from offsetWidth, which ignores transforms. Centres are safe to take from
    // the rects: rotation is about the centre, so it doesn't move.
    const playerWidth = playerVinylEl.offsetWidth;
    if (!playerWidth || !slotRect.width) return null;

    return {
      x: (slotRect.left + slotRect.width / 2) - (playerRect.left + playerRect.width / 2),
      y: (slotRect.top + slotRect.height / 2) - (playerRect.top + playerRect.height / 2),
      scale: slotRect.width / playerWidth,
      opacity: Number(window.getComputedStyle(menuVinylEl).opacity) || 1,
    };
  };

  const finishFlight = () => {
    if (!isReturningRef.current) return;
    isReturningRef.current = false;
    clearTimeout(flightTimeoutRef.current);
    flightTimeoutRef.current = null;
    clearPlayer();
  };

  // The single eject animation, shared by the Eject button and the drag-off.
  // `from` is where the record starts relative to its resting spot on the
  // player -- {0,0} for the button, the drag delta for a drag-off -- so a
  // dragged record picks the flight up from exactly where it was dropped
  // instead of snapping back to the platter first.
  //
  // Uses the Web Animations API rather than toggling CSS classes across rAF
  // ticks: the whole from/to path is declared in one call, so it can't
  // half-apply if a frame is dropped or the tab isn't actively rendering.
  const flyHome = (from, { duration, liftOff }) => {
    if (!vinylOnPlayer || isReturningRef.current) return;
    isReturningRef.current = true;
    stopAudioForEject();
    setIsReturning(true);

    const el = vinylElRef.current;
    const home = measureHomeSlot();
    if (!el || !home) {
      finishFlight();
      return;
    }

    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const flightMs = reduceMotion ? 140 : duration;
    const at = (offset, x, y, scale, easing) => ({
      offset,
      transform: `translate(${x}px, ${y}px) scale(${scale})`,
      ...(easing ? { easing } : {}),
    });

    // Transform and opacity run as two animations so their timings stay
    // independent: the record holds full opacity for most of the trip and only
    // settles into the slot's dimmed state as it arrives. Interleaving them as
    // shared keyframes would force the easing curve to restart mid-flight.
    const path = liftOff && !reduceMotion
      ? [
          at(0, from.x, from.y, from.scale, "cubic-bezier(0.34, 0, 0.5, 1)"),
          at(0.2, from.x, from.y - 18, from.scale * 1.06, "cubic-bezier(0.22, 1, 0.36, 1)"),
          at(1, home.x, home.y, home.scale),
        ]
      : [
          at(0, from.x, from.y, from.scale, "cubic-bezier(0.22, 1, 0.36, 1)"),
          at(1, home.x, home.y, home.scale),
        ];

    el.animate(path, { duration: flightMs, fill: "forwards" });
    const flight = el.animate(
      [{ opacity: 1 }, { opacity: home.opacity }],
      {
        duration: Math.round(flightMs * 0.45),
        delay: Math.round(flightMs * 0.55),
        easing: "ease-out",
        fill: "both",
      }
    );

    // The hand-off is driven by a timer rather than onfinish alone: onfinish is
    // delivered on a frame tick, so a busy or throttled frame can hold the
    // landed record on screen well past the animation and leave a visible pause
    // before the menu slot lights back up. The timer lands it on schedule and
    // onfinish just gets there first when it can. Both routes are idempotent,
    // and fill:forwards means an early-firing timer still finds the record
    // parked on its final frame.
    flight.onfinish = finishFlight;
    flightTimeoutRef.current = setTimeout(finishFlight, flightMs + 30);
  };

  const ejectVinyl = () => flyHome(
    { x: 0, y: 0, scale: 1 },
    { duration: EJECT_FLIGHT_MS, liftOff: true }
  );

  useEffect(() => () => clearTimeout(flightTimeoutRef.current), []);

  const [{ isOver }, drop] = useDrop(() => ({
    accept: "VINYL",
    drop: handleTrackDrop,
    collect: (monitor) => ({ isOver: !!monitor.isOver() }),
  }));

  const [{ isDraggingOff }, dragOff] = useDrag(() => ({
    type: "PLAYER_VINYL",
    item: { type: "PLAYER_VINYL" },
    canDrag: !!vinylOnPlayer && !isReturning,
    end: (item, monitor) => {
      const dropPoint = monitor.getClientOffset();
      const startPoint = monitor.getInitialClientOffset();
      const from = (dropPoint && startPoint)
        ? { x: dropPoint.x - startPoint.x, y: dropPoint.y - startPoint.y, scale: 1 }
        : { x: 0, y: 0, scale: 1 };

      flyHome(from, { duration: DRAG_FLIGHT_MS, liftOff: false });
    },
    collect: (monitor) => ({ isDraggingOff: !!monitor.isDragging() }),
  }), [vinylOnPlayer, isReturning]);

  // Add effect to handle drop zone active state
  useEffect(() => {
    setDropActive(isOver);
  }, [isOver]);

  // Format track time
  const formatTime = (seconds) => {
    const totalSeconds = Math.floor(seconds * trackDuration / 100);
    const mins = Math.floor(totalSeconds / 60);
    const secs = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  return (
    <div
      ref={drop}
      className={`record-player-container ${dropActive ? 'drop-active' : ''}`}
    >
      {/* The spin lives on the platter graphic below, not on this container.
          The record being ejected is a child of this element, so if it rotated,
          the flight home -- measured in viewport coordinates -- would be applied
          in a spinning coordinate frame and the record would spiral off its
          slot instead of landing on it. Keeping the housing still also stops the
          drop hint from rotating out from under the reader. */}
      <div className="record-player">
        <svg
          className={isPlaying && !isReturning ? "spinning" : ""}
          viewBox="0 0 300 300"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="150" cy="150" r="140" fill="#222" stroke="#111" strokeWidth="5" />
          <g>
            <circle cx="150" cy="150" r="120" fill="black" stroke="gray" strokeWidth="2" />
            {currentTrack &&
              [110, 100, 90, 80, 70, 60, 50, 40, 30, 20].map((r, i) => (
                <circle
                  key={i}
                  cx="150"
                  cy="150"
                  r={r}
                  fill="none"
                  stroke="#333"
                  strokeWidth="2"
                  strokeDasharray={r % 7 === 0 ? "3,5" : "5,3"}
                />
              ))}
            <circle cx="150" cy="150" r="5" fill="white" />
          </g>
        </svg>

        {/* Vinyl overlay on the player */}
        {vinylOnPlayer && (
          <div
            ref={(node) => {
              vinylElRef.current = node;
              dragOff(node);
            }}
            className={`vinyl-on-player ${isEntering ? "entering" : ""} ${isPlaying && !isReturning ? "spinning" : ""} ${isReturning ? "returning" : ""} ${isDraggingOff ? "dragging-off" : ""}`}
            style={{ background: getVinylColor(vinylOnPlayer.title) }}
          >
            <div className="vinyl-grooves"></div>
          </div>
        )}

        {(dropActive || isDraggingOff) && (
          <div className="drop-indicator">
            <span>{isDraggingOff ? "Drop Anywhere to Eject" : "Drop Record Here"}</span>
          </div>
        )}
      </div>

      {currentTrack ? (
        <div className="controls">
          <div className="buttons">
            <button onClick={togglePlayPause} className={isPlaying ? "active" : ""}>
              {isPlaying ? "Pause" : "Play"}
            </button>
            <button onClick={stopAudio}>Stop</button>
            <button onClick={() => ejectVinyl()}>Eject</button>
          </div>
          <div className="now-playing">
            <p>{nowPlaying}</p>
            <div className="progress-bar">
              <div className="progress" style={{ transform: `scaleX(${trackProgress / 100})` }}></div>
            </div>
            <div className="time-display">
              <span>{formatTime(trackProgress)}</span>
              <span>{formatTime(100)}</span>
            </div>
          </div>
        </div>
      ) : null}

      <Content trackTitle={currentTrackTitle} />
    </div>
  );
};

export default RecordPlayer;