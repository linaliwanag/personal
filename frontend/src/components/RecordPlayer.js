import React, { useState, useEffect } from "react";
import { useDrop } from "react-dnd";
import "./RecordPlayer.css";

import Content from "./Content";

const RecordPlayer = () => {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [currentTrackTitle, setCurrentTrackTitle] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [rotationDegrees, setRotationDegrees] = useState(0);
  const [ytPlayer, setYtPlayer] = useState(null);
  const [resetColors, setResetColors] = useState(false); // not actually using rn
  const [trackProgress, setTrackProgress] = useState(0);
  const [nowPlaying, setNowPlaying] = useState("No track selected")
  let animationFrameRef = null;

  // youtube handling
  useEffect(() => {
    if (!currentTrack) return;

    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.body.appendChild(tag);

    const checkYouTubeAPI = setInterval(() => {
      if (window.YT && window.YT.Player && !ytPlayer) {
        clearInterval(checkYouTubeAPI);

        if (ytPlayer) {
          ytPlayer.destroy()
          setYtPlayer(null)
        }

        const player = new window.YT.Player("youtube-player", {
          events: {
            onReady: (event) => {
              console.log("YouTube Player is ready");
              setYtPlayer(event.target);
            },
            onStateChange: (event) => {
              setIsPlaying(event.data === window.YT.PlayerState.PLAYING);
            }
          }
        });
      }
    }, 500);

    return () => clearInterval(checkYouTubeAPI);
  }, [currentTrack]);

  // animation handling
  useEffect(() => {
    let animationFrame;
    const updateRotation = () => {
      if (isPlaying) {
        setRotationDegrees((prev) => (prev + 1) % 360);
        animationFrame = requestAnimationFrame(updateRotation);
      }
    };
    if (isPlaying) {
      animationFrame = requestAnimationFrame(updateRotation);
    }
    return () => cancelAnimationFrame(animationFrame);
  }, [isPlaying]);

  // progress handling
  useEffect(() => {
    if (!ytPlayer) return;

    const updateProgress = () => {
      if (ytPlayer && ytPlayer.getCurrentTime && ytPlayer.getDuration) {
        const currentTime = ytPlayer.getCurrentTime();
        const duration = ytPlayer.getDuration();
        if (duration > 0) {
          setTrackProgress((currentTime / duration) * 100);
          if (currentTime >= duration) {
            stopVideo();
          }
        }
      }
      requestAnimationFrame(updateProgress);
    };

    if (isPlaying) {
      updateProgress();
    }

    return () => cancelAnimationFrame(updateProgress);
  }, [isPlaying, ytPlayer]);

  const handleTrackDrop = (videoId, title) => {
    setCurrentTrack(`https://www.youtube.com/embed/${videoId}?enablejsapi=1`);
    setCurrentTrackTitle(title);
    setNowPlaying(() => {
      if (title === "About") return `"From the Start" by Laufey`
      if (title === "Projects") return `"the perfect pair" by beabadoobee`
      if (title === "Contact") return `"Love like Before" by Rebby Han`
    })
    setIsPlaying(false);
    setResetColors(false);
    setTrackProgress(0)
  };

  const togglePlayPause = () => {
    if (!ytPlayer) {
      console.warn("YouTube player is not initialized yet.");
      return;
    }

    setIsPlaying((prev) => {
      const newState = !prev;
      const state = ytPlayer.getPlayerState();
      if (state === window.YT.PlayerState.PLAYING) {
        ytPlayer.pauseVideo();
      } else if (state === window.YT.PlayerState.PAUSED ||
        state === window.YT.PlayerState.ENDED ||
        state === window.YT.PlayerState.UNSTARTED ||
        state === window.YT.PlayerState.CUED) {
        ytPlayer.playVideo();
      }
      return newState;
    });
  };

  const stopVideo = () => {
    if (ytPlayer) {
      ytPlayer.stopVideo();
      setRotationDegrees(0);
      setTrackProgress(0)
      setIsPlaying(false);
    }
  };

  const ejectVinyl = () => {
    if (ytPlayer) {
      ytPlayer.stopVideo();
      ytPlayer.destroy();
      setYtPlayer(null);
    }
    setCurrentTrack(null);
    setCurrentTrackTitle(null);
    setIsPlaying(false);
    setResetColors(true);
    setTrackProgress(0)
  };

  const [{ isOver }, drop] = useDrop(() => ({
    accept: "VINYL",
    drop: (item) => handleTrackDrop(item.videoId, item.title),
    collect: (monitor) => ({ isOver: !!monitor.isOver() }),
  }));

  // now playing handling

  return (
    <div className="record-player-container" style={{ textAlign: "center", marginTop: "20px", display: "flex", flexDirection: "column", alignItems: "center", minHeight: "250px" }}>
      <div ref={drop} className="record-player">
        {currentTrack && (
          <div className={`vinyl ${isPlaying ? "spinning" : ""}`}>{currentTrackTitle}</div>
        )}
        {!currentTrack && <div className="drop-text">Drop Vinyl Here</div>}
      </div>
      {currentTrack && (
        <div className="controls">
          <iframe
            id="youtube-player"
            title="YouTube Player"
            width="300"
            height="200"
            src={currentTrack}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{
              display: "none",
              borderRadius: "12px", margin: "20px 0"
            }}
          ></iframe>
          <div className="buttons">
            <button onClick={togglePlayPause}>{isPlaying ? "Pause" : "Play"}</button>
            <button onClick={stopVideo}>Stop</button>
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
