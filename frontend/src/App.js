import React from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import RecordPlayer from "./components/RecordPlayer";
import Vinyl from "./components/Vinyl";
import './App.css'

const vinyls = [
  { id: 1, title: "About", videoId: "lSD_L-xic9o" },
  { id: 2, title: "Projects", videoId: "3WpdCZC9q6w" },
  { id: 3, title: "Contact", videoId: "eAbJyT0M8L8" }
];

const App = () => {
  return (
    <DndProvider backend={HTML5Backend}>
      <div style={{ textAlign: "center", padding: "20px" }}>
        {/* <h1>drag and drop a record onto the player to learn more about me!</h1> */}
        <div style={{ display: "flex", justifyContent: "center", marginTop: "20px" }}>
          {vinyls.map((vinyl) => (
            <Vinyl key={vinyl.id} id={vinyl.id} title={vinyl.title} videoId={vinyl.videoId} />
          ))}
        </div>
        <RecordPlayer />
      </div>
    </DndProvider>
  );
};

export default App;
