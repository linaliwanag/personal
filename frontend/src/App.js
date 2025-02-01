import React from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import RecordPlayer from "./components/RecordPlayer";
import Vinyl from "./components/Vinyl";

const App = () => {
  const vinyls = [
    {
      id: 1,
      title: "Track 1",
      embedUrl:
        "https://open.spotify.com/embed/track/43iIQbw5hx986dUEZbr3eN?utm_source=generator",
    },
    {
      id: 2,
      title: "Track 2",
      embedUrl:
        "https://open.spotify.com/embed/track/41P6Tnd8KIHqON0QIydx6a?utm_source=generator",
    },
  ];

  return (
    <DndProvider backend={HTML5Backend}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <h1>drag and drop a record to learn more about me!</h1>
        <div style={{ display: "flex", gap: "20px" }}>
          {vinyls.map((vinyl) => (
            <Vinyl key={vinyl.id} vinyl={vinyl} />
          ))}
        </div>
        <RecordPlayer />
      </div>
    </DndProvider>
  );
};

export default App;

/**
 * from the start
 *<iframe
  style="border-radius:12px"
  src="https://open.spotify.com/embed/track/43iIQbw5hx986dUEZbr3eN?utm_source=generator"
  width="100%"
  height="152"
  frameBorder="0"
  allowfullscreen=""
  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
  loading="lazy"
></iframe>;

   *
  the perfect pair
  <iframe
  style="border-radius:12px"
  src="https://open.spotify.com/embed/track/41P6Tnd8KIHqON0QIydx6a?utm_source=generator"
  width="100%"
  height="152"
  frameBorder="0"
  allowfullscreen=""
  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
  loading="lazy"
></iframe>;


 */
