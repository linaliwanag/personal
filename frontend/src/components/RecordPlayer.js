import React, { useState, useEffect, useRef } from "react";
import { useDrop } from "react-dnd";
import "./RecordPlayer.css";

const RecordPlayer = () => {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [currentTrackTitle, setCurrentTrackTitle] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [rotationDegrees, setRotationDegrees] = useState(0);
  const [ytPlayer, setYtPlayer] = useState(null);

  useEffect(() => {
    if (!currentTrack) return; // Only trigger when embed appears

    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.body.appendChild(tag);

    const checkYouTubeAPI = setInterval(() => {
      if (window.YT && window.YT.Player && !ytPlayer) {
        clearInterval(checkYouTubeAPI);
        const player = new window.YT.Player("youtube-player", {
          events: {
            onReady: (event) => {
              console.log("YouTube Player is ready");
              setYtPlayer(event.target);
            },
            onStateChange: (event) => {
              setIsPlaying(event.data === window.YT.PlayerState.PLAYING);
              // setIsPlaying(prev => { return !prev });
            }
          }
        });
      }
    }, 500);

    return () => clearInterval(checkYouTubeAPI);
  }, [currentTrack]); // Trigger only when a track is set


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

  const handleTrackDrop = (videoId, title) => {
    setCurrentTrack(`https://www.youtube.com/embed/${videoId}?enablejsapi=1`);
    setCurrentTrackTitle(title);
    console.log("track dropped")
    setIsPlaying(false); // Set to false initially, require manual play
  };

  // const playVideo = () => {
  //   if (ytPlayer.current && ytPlayer.current.playVideo) {
  //     ytPlayer.current.playVideo();
  //     setIsPlaying(true);
  //     console.log("playing video")
  //   } else {
  //     console.error("YouTube player is not initialized yet.");
  //   }
  // };

  // const pauseVideo = () => {
  //   if (ytPlayer.current && ytPlayer.current.pauseVideo) {
  //     ytPlayer.current.pauseVideo();
  //     console.log("pausing video")
  //     setIsPlaying(false);
  //   } else {
  //     console.error("YouTube player is not initialized yet.");
  //   }
  // };

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
      // ytPlayer.seekTo(0, false);
      ytPlayer.stopVideo();
      setIsPlaying(false);
    }
  };

  const ejectVinyl = () => {
    stopVideo();
    setCurrentTrack(null);
    setCurrentTrackTitle(null);
  };

  const [{ isOver }, drop] = useDrop(() => ({
    accept: "VINYL",
    drop: (item) => handleTrackDrop(item.videoId, item.title),
    collect: (monitor) => ({ isOver: !!monitor.isOver() }),
  }));

  return (
    <div style={{ textAlign: "center", marginTop: "20px", display: "flex", flexDirection: "column", alignItems: "center", minHeight: "250px" }}>
      <div ref={drop} className={`record-container ${isPlaying ? "spinning" : ""}`}>
        {currentTrack && (
          <div className="record">{currentTrackTitle}</div>
        )}
        {!currentTrack && <div className="drop-text">Drop Vinyl Here</div>}
      </div>
      {currentTrack && (
        <div>
          <iframe
            id="youtube-player"
            title="YouTube Player"
            width="300"
            height="200"
            src={currentTrack}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{ borderRadius: "12px", margin: "20px 0" }}
          ></iframe>
          <div>
            <button onClick={togglePlayPause} style={{ marginRight: "10px", padding: "10px 20px", fontSize: "16px" }}>
              {isPlaying ? "Pause" : "Play"}
            </button>
            <button onClick={stopVideo} style={{ marginRight: "10px", padding: "10px 20px", fontSize: "16px" }}>
              Stop
            </button>
            <button onClick={ejectVinyl} style={{ padding: "10px 20px", fontSize: "16px" }}>Eject</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecordPlayer;
