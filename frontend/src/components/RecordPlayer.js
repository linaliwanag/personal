import React, { useState, useEffect } from "react";
import { useDrop } from "react-dnd";
import "./RecordPlayer.css";

const RecordPlayer = () => {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [currentTrackTitle, setCurrentTrackTitle] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  let ytPlayer;

  useEffect(() => {
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.body.appendChild(tag);

    window.onYouTubeIframeAPIReady = () => {
      ytPlayer = new window.YT.Player("youtube-player", {
        events: {
          onReady: () => console.log("YouTube Player is ready"),
        },
      });
    };
  }, []);

  const handleTrackDrop = (videoId, title) => {
    setCurrentTrack(`https://www.youtube.com/embed/${videoId}?enablejsapi=1&autoplay=1`);
    setCurrentTrackTitle(title);
  };

  const togglePlayPause = () => {
    if (ytPlayer && ytPlayer.getPlayerState) {
      ytPlayer.getPlayerState() === 1 ? ytPlayer.pauseVideo() : ytPlayer.playVideo();
      setIsPlaying((prev) => !prev);
    }
  };

  const ejectVinyl = () => {
    setCurrentTrack(null);
    setCurrentTrackTitle(null);
    setIsPlaying(false);
  };

  const [{ isOver }, drop] = useDrop(() => ({
    accept: "VINYL",
    drop: (item) => handleTrackDrop(item.videoId, item.title),
    collect: (monitor) => ({ isOver: !!monitor.isOver() }),
  }));

  return (
    <div style={{ textAlign: "center", marginTop: "20px", display: "flex", flexDirection: "column", alignItems: "center", minHeight: "250px" }}>
      <div ref={drop} className="record-container">
        {currentTrack && (
          <div className="record">{currentTrackTitle}</div>
        )}
        {!currentTrack && <div className="drop-text">Drop Vinyl Here</div>}
      </div>
      {currentTrack && (
        <>
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
            <button onClick={ejectVinyl} style={{ padding: "10px 20px", fontSize: "16px" }}>Eject</button>
          </div>
        </>
      )}
    </div>
  );
};

export default RecordPlayer;
