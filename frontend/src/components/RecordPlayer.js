import React, { useState, useEffect, useRef } from "react";
import { useDrop } from "react-dnd";
import "./RecordPlayer.css";

import Content from "./Content";

const RecordPlayer = () => {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [currentTrackTitle, setCurrentTrackTitle] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [trackProgress, setTrackProgress] = useState(0);
  const [nowPlaying, setNowPlaying] = useState("No track selected");
  const [dropActive, setDropActive] = useState(false);
  const audioRef = useRef(null);
  const animationRef = useRef(null);

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
        fadeIn(newAudio, 0.05);
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
    }
  }, [currentTrack, currentTrackTitle]);

  useEffect(() => {
    if (!audioRef.current || !audioRef.current.src) return;

    if (isPlaying) {
      audioRef.current.play().catch(error => console.error("Audio play failed:", error));
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying]);

  const fadeIn = (audioElement, step) => {
    let volume = 0;
    const fadeInterval = setInterval(() => {
      if (volume < 0.8) {
        volume = Math.min(volume + step, 0.8);
        audioElement.volume = volume;
      } else {
        clearInterval(fadeInterval);
      }
    }, 100);
  };

  const fadeOut = (audioElement, step, callback) => {
    let volume = audioElement.volume;
    const fadeInterval = setInterval(() => {
      if (volume > 0) {
        volume = Math.max(volume - step, 0);
        audioElement.volume = volume;
      } else {
        clearInterval(fadeInterval);
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

  const ejectVinyl = () => {
    if (audioRef.current) {
      fadeOut(audioRef.current, 0.1, () => {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current.load();
        setCurrentTrack(null);
        setCurrentTrackTitle(null);
        setIsPlaying(false);
        setTrackProgress(0);
        setNowPlaying("No track selected");
      });
    }
  };

  const [{ isOver }, drop] = useDrop(() => ({
    accept: "VINYL",
    drop: handleTrackDrop,
    collect: (monitor) => ({ isOver: !!monitor.isOver() }),
  }));

  // Add effect to handle drop zone active state
  useEffect(() => {
    setDropActive(isOver);
  }, [isOver]);

  // Format track time
  const formatTime = (seconds) => {
    if (!audioRef.current) return "0:00";
    const totalSeconds = Math.floor(seconds * (audioRef.current.duration || 0) / 100);
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
        
        {dropActive && (
          <div className="drop-indicator">
            <span>Drop Record Here</span>
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
            <button onClick={ejectVinyl}>Eject</button>
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
      ) : (
        <div className="empty-message">
          <p>Drag a record onto the player</p>
        </div>
      )}

      <Content trackTitle={currentTrackTitle} />
    </div>
  );
};

export default RecordPlayer;