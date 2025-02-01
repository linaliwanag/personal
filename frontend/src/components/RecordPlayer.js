import React, { useState, useEffect } from "react";
import { useDrop } from "react-dnd";

const RecordPlayer = ({ onDropVinyl }) => {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrackTitle, setCurrentTrackTitle] = useState(null);
  const [rotationDegrees, setRotationDegrees] = useState(0);

  const [{ isOver }, drop] = useDrop(() => ({
    accept: "VINYL",
    drop: (item) => {
      setCurrentTrack(item.embedUrl);
      setCurrentTrackTitle(item.title);
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  }));

  useEffect(() => {
    const messageHandler = (event) => {
      if (event.origin.includes("spotify.com")) {
        try {
          const data =
            typeof event.data === "string"
              ? JSON.parse(event.data)
              : event.data;
          if (data?.name === "play") {
            setIsPlaying(true);
          } else if (data?.name === "pause") {
            setIsPlaying(false);
          }
        } catch (error) {
          console.error("Error parsing Spotify message:", error, event.data);
        }
      }
    };
    window.addEventListener("message", messageHandler);
    return () => window.removeEventListener("message", messageHandler);
  }, []);

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

  const togglePlayPause = () => {
    setIsPlaying((prev) => {
      const newState = !prev;
      const iframe = document.querySelector("iframe");
      if (iframe) {
        iframe.contentWindow.postMessage(
          JSON.stringify({ method: newState ? "play" : "pause" }),
          "*"
        );
      }
      return newState;
    });
  };

  const ejectVinyl = () => {
    setCurrentTrack(null);
    setCurrentTrackTitle(null);
    setIsPlaying(false);
    setRotationDegrees(0);
  };

  return (
    <div
      style={{
        textAlign: "center",
        marginTop: "20px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        minHeight: "250px",
      }}
    >
      <div
        ref={drop}
        style={{
          width: "200px",
          height: "200px",
          borderRadius: "50%",
          background: "gray",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "background 0.3s ease",
          position: "relative",
        }}
      >
        {currentTrack && (
          <div
            style={{
              width: "180px",
              height: "180px",
              borderRadius: "50%",
              background: "#222",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "absolute",
              transform: `rotate(${rotationDegrees}deg)`,
              fontSize: "14px",
              fontWeight: "bold",
              textAlign: "center",
            }}
          >
            {currentTrackTitle}
          </div>
        )}
        {!currentTrack && (
          <div style={{ position: "absolute", textAlign: "center" }}>
            Drop Vinyl Here
          </div>
        )}
      </div>
      <div
        style={{
          minHeight: "120px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <iframe
          title="Spotify Player"
          src={currentTrack || "about:blank"}
          width="300"
          height="80"
          frameBorder="0"
          allowtransparency="true"
          allow="encrypted-media"
          style={{
            borderRadius: "12px",
            margin: "20px 0",
            visibility: currentTrack ? "visible" : "hidden",
          }}
        ></iframe>
        {currentTrack && (
          <div>
            <button
              onClick={togglePlayPause}
              style={{
                marginRight: "10px",
                padding: "10px 20px",
                fontSize: "16px",
              }}
            >
              {isPlaying ? "Pause" : "Play"}
            </button>
            <button
              onClick={ejectVinyl}
              style={{ padding: "10px 20px", fontSize: "16px" }}
            >
              Eject
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecordPlayer;
