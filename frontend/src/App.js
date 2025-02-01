import React from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import RecordPlayer from "./components/RecordPlayer";
import Vinyl from "./components/Vinyl";

const vinyls = [
  { id: 1, title: "Track 1", videoId: "lSD_L-xic9o" },
  { id: 2, title: "Track 2", videoId: "3WpdCZC9q6w" },
  { id: 3, title: "Track 3", videoId: "eAbJyT0M8L8" }
];

const App = () => {
  return (
    <DndProvider backend={HTML5Backend}>
      <div style={{ textAlign: "center", padding: "20px" }}>
        <h1>Drag and Drop a Record to Learn More About Me!</h1>
        <RecordPlayer />
        <div style={{ display: "flex", justifyContent: "center", marginTop: "20px" }}>
          {vinyls.map((vinyl) => (
            <Vinyl key={vinyl.id} id={vinyl.id} title={vinyl.title} videoId={vinyl.videoId} />
          ))}
        </div>
      </div>
    </DndProvider>
  );
};

export default App;
