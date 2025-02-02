import React from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import RecordPlayer from "./components/RecordPlayer";
import Vinyl from "./components/Vinyl";
import './App.css'

const vinyls = [
  { id: 1, title: "About", videoId: process.env.REACT_APP_VIDEO_1 },
  { id: 2, title: "Projects", videoId: process.env.REACT_APP_VIDEO_2 },
  { id: 3, title: "Contact", videoId: process.env.REACT_APP_VIDEO_3 }
];

const App = () => {
  return (
    <DndProvider backend={HTML5Backend}>
      <div style={{ textAlign: "center", padding: "20px" }}>
        {/* <h1>drag and drop a record onto the player to learn more about me!</h1> */}
        <div className="vinyl-menu" style={{ display: "flex", justifyContent: "center", marginTop: "20px" }}>
          {vinyls.map((vinyl) => (
            <Vinyl key={vinyl.id} id={vinyl.id} title={vinyl.title} videoId={vinyl.videoId} dragged />
          ))}
        </div>
        <RecordPlayer />
      </div>
    </DndProvider>
  );
};

export default App;
