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
  const audioRef = useRef(null);

  useEffect(() => {
    if (currentTrack) {
      console.log("Setting new track:", currentTrack); // Debugging
      if (audioRef.current) {
        audioRef.current.pause();
      }

      const absolutePath = window.location.origin + currentTrack;
      console.log("Resolved absolute path:", absolutePath); // Debugging

      const newAudio = new Audio(absolutePath);  // Use absolute path
      newAudio.onended = () => {
        setIsPlaying(false);
        setTrackProgress(0);
        setNowPlaying("No track selected");
        setCurrentTrack(null);
      };
      newAudio.onloadedmetadata = () => {
        newAudio.volume = 0;
        fadeIn(newAudio, 0.1);
        setIsPlaying(true);
      };
      audioRef.current = newAudio;

      // todo: cleanup
      setNowPlaying(() => {
        if (currentTrackTitle === "About") return `track 1`
        if (currentTrackTitle === "Projects") return `track 2`
        if (currentTrackTitle === "Contact") return `track 3`
      })

    } else {
      setNowPlaying("No track selected");
      setIsPlaying(false);
      setTrackProgress(0);
    }
    console.log(`useEffect: current track is ${currentTrack} and isPlaying is ${isPlaying}`)
  }, [currentTrack]);

  useEffect(() => {
    if (!audioRef.current || !audioRef.current.src) return;

    const updateProgress = () => {
      if (audioRef.current) {
        setTrackProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
        if (!audioRef.current.paused) requestAnimationFrame(updateProgress);
      }
    };

    if (isPlaying) {
      // console.log("Playing audio"); // Debugging
      audioRef.current.play().catch(error => console.error("Audio play failed:", error));
      requestAnimationFrame(updateProgress);
    } else {
      // console.log("Pausing audio"); // Debugging
      audioRef.current.pause();
    }
  }, [isPlaying]);

  const fadeIn = (audioElement, step) => {
    let volume = 0;
    const fadeInterval = setInterval(() => {
      if (volume < 1) {
        volume = Math.min(volume + step, 1);
        audioElement.volume = volume;
      } else {
        clearInterval(fadeInterval);
      }
    }, 200);
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
    }, 200);
  };

  const handleTrackDrop = (item) => {
    console.log("Track dropped:", item); // Debugging
    const { filePath, title } = item;
    if (!filePath) {
      console.error("No filePath received! Check Vinyl component.");
      return;
    }

    setCurrentTrack(filePath);
    setCurrentTrackTitle(title);
    setIsPlaying(false); // Ensure it doesn't auto-play after ejecting
    setTrackProgress(0);
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
      audioRef.current.currentTime = 0;
      audioRef.current.pause();
      setIsPlaying(false);
      setTrackProgress(0);
    }
  };

  const ejectVinyl = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current.load();
      setCurrentTrack(null);
      setCurrentTrackTitle(null);
      setIsPlaying(false);
      setTrackProgress(0);
      setNowPlaying("No track selected");
    }
  };

  const [{ isOver }, drop] = useDrop(() => ({
    accept: "VINYL",
    drop: handleTrackDrop,
    collect: (monitor) => ({ isOver: !!monitor.isOver() }),
  }));

  return (
    <div ref={drop} className="record-player-container" style={{ textAlign: "center", marginTop: "20px", display: "flex", flexDirection: "column", alignItems: "center", minHeight: "250px" }}>
      <div className={`record-player ${isPlaying ? "spinning" : ""}`} >
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
      </div>
      {currentTrack && (
        <div className="controls">
          <audio style={{ display: "none" }} src="/assets/music/daises.mp3" controls></audio>
          <div className="buttons">
            <button onClick={togglePlayPause}>{isPlaying ? "Pause" : "Play"}</button>
            <button onClick={stopAudio}>Stop</button>
            <button onClick={ejectVinyl}>Eject</button>
          </div>
          <div className="now-playing">
            <p>Now Playing: {nowPlaying}</p>
            <div className="progress-bar">
              <div className="progress" style={{ width: `${trackProgress}%` }}></div>
            </div>
          </div>
        </div>
      )}

      <Content trackTitle={currentTrackTitle} />
    </div>
  );
};

export default RecordPlayer;