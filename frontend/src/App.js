import React, { useState } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import RecordPlayer from "./components/RecordPlayer";
import Vinyl from "./components/Vinyl";
import './App.css'

const vinyls = [
  { id: 1, title: "About", filePath: "/assets/music/daisies.mp3" },
  { id: 2, title: "Projects", filePath: "/assets/music/can_i_call_this_bossa_nova.mp3" },
  { id: 3, title: "Contact", filePath: "/assets/music/good_enough.mp3" }
];

// todo: make usable on mobile browser**

const App = () => {
  const [isDragging, setIsDragging] = useState(false);

  // Add some effects for dragging
  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="animated-background"></div>
      <div className={`app-container ${isDragging ? 'dragging-active' : ''}`}>
        <header>
          <h1 className="main-title">Paulina Liwanag</h1>
          <p className="subtitle">Drag a record onto the player to learn more about me</p>
        </header>

        <div className="vinyl-menu">
          {vinyls.map((vinyl, index) => (
            <div 
              key={index} 
              className="vinyl-wrapper"
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <Vinyl
                title={vinyl.title}
                filePath={vinyl.filePath}
              />
              <span className="vinyl-hint">{vinyl.title}</span>
            </div>
          ))}
        </div>
        
        <RecordPlayer />
      </div>
    </DndProvider>
  );
};

export default App;