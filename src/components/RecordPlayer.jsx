import React, { useState, useEffect, useRef } from "react";
import { useDrag, useDrop } from "react-dnd";
import { getVinylColor } from "../vinylColors";
import "./RecordPlayer.css";

import Content from "./Content";

const RecordPlayer = ({ onVinylChange, currentVinyl }) => {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [currentTrackTitle, setCurrentTrackTitle] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [trackProgress, setTrackProgress] = useState(0);
  const [trackDuration, setTrackDuration] = useState(0);
  const [nowPlaying, setNowPlaying] = useState("No track selected");
  const [dropActive, setDropActive] = useState(false);
  const [vinylOnPlayer, setVinylOnPlayer] = useState(null);
  const [isEjecting, setIsEjecting] = useState(false);
  const [isFlyingBack, setIsFlyingBack] = useState(false);
  const [isEntering, setIsEntering] = useState(false);
  const audioRef = useRef(null);
  const fadeIntervalRef = useRef(null);
  const vinylElRef = useRef(null);

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
    // other class (like .ejecting) toggles on the same element -- CSS animations
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
    setIsEjecting(false);
    setIsFlyingBack(false);
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

  const ejectVinyl = () => {
    if (!vinylOnPlayer) return;
    stopAudioForEject();
    setIsEjecting(true);
    setTimeout(clearPlayer, 500);
  };

  // Drag-off gets its own animation: fly from wherever it was dropped back to
  // its slot in the vinyl menu. Uses the Web Animations API rather than
  // toggling CSS classes across rAF ticks -- the from/to keyframes are declared
  // in one call, so it can't half-apply if a frame is dropped or the tab isn't
  // actively rendering.
  const ejectVinylByDrag = (dropOffset, snapTarget) => {
    if (!vinylOnPlayer) return;
    stopAudioForEject();

    const el = vinylElRef.current;
    if (el) {
      setIsFlyingBack(true);
      const animation = el.animate(
        [
          { transform: `translate(${dropOffset.x}px, ${dropOffset.y}px) scale(1)`, opacity: 0.6 },
          { transform: `translate(${snapTarget.x}px, ${snapTarget.y}px) scale(0.5)`, opacity: 0 },
        ],
        { duration: 450, easing: "cubic-bezier(0.4, 0, 0.2, 1)", fill: "forwards" }
      );
      animation.onfinish = clearPlayer;
      // Fallback in case onfinish never fires (e.g. animation cancelled by an
      // unmount) so the player can't get stuck holding a vinyl.
      setTimeout(() => {
        if (vinylOnPlayer) clearPlayer();
      }, 700);
    } else {
      setTimeout(clearPlayer, 500);
    }
  };

  const [{ isOver }, drop] = useDrop(() => ({
    accept: "VINYL",
    drop: handleTrackDrop,
    collect: (monitor) => ({ isOver: !!monitor.isOver() }),
  }));

  const [{ isDraggingOff }, dragOff] = useDrag(() => ({
    type: "PLAYER_VINYL",
    item: { type: "PLAYER_VINYL" },
    canDrag: !!vinylOnPlayer,
    end: (item, monitor) => {
      const dropPoint = monitor.getClientOffset();
      const startPoint = monitor.getInitialClientOffset();
      const dropOffset = (dropPoint && startPoint)
        ? { x: dropPoint.x - startPoint.x, y: dropPoint.y - startPoint.y }
        : { x: 0, y: 0 };

      // Find where this vinyl's actual slot in the menu is, so it flies back
      // there rather than just to the player's own center.
      let snapTarget = { x: 0, y: 0 };
      const playerVinylEl = vinylElRef.current;
      const menuSlot = [...document.querySelectorAll(".vinyl-wrapper")]
        .find((w) => w.querySelector(".vinyl-hint")?.textContent === vinylOnPlayer?.title);
      const menuVinylEl = menuSlot?.querySelector(".vinyl-record");
      if (playerVinylEl && menuVinylEl) {
        const playerRect = playerVinylEl.getBoundingClientRect();
        const slotRect = menuVinylEl.getBoundingClientRect();
        snapTarget = {
          x: (slotRect.left + slotRect.width / 2) - (playerRect.left + playerRect.width / 2),
          y: (slotRect.top + slotRect.height / 2) - (playerRect.top + playerRect.height / 2),
        };
      }

      ejectVinylByDrag(dropOffset, snapTarget);
    },
    collect: (monitor) => ({ isDraggingOff: !!monitor.isDragging() }),
  }), [vinylOnPlayer]);

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
      <div className={`record-player ${isPlaying ? "spinning" : ""}`}>
        <svg
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
            className={`vinyl-on-player ${isEntering ? "entering" : ""} ${isPlaying && !isEjecting && !isFlyingBack ? "spinning" : ""} ${isEjecting ? "ejecting" : ""} ${isDraggingOff ? "dragging-off" : ""}`}
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