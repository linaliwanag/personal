import React, { useState, useEffect } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import RecordPlayer from "./components/RecordPlayer";
import Vinyl from "./components/Vinyl";
import Modal from "./components/Modal";
import { vinyls } from "./contentData";
import 'boxicons';
import './App.css'

// todo: make usable on mobile browser**

const App = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileView, setShowMobileView] = useState(false);
  const [selectedVinyl, setSelectedVinyl] = useState(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Add some effects for dragging
  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const toggleView = () => {
    setShowMobileView(!showMobileView);
  };

  const handleVinylClick = (vinyl) => {
    setSelectedVinyl(vinyl);
  };

  const renderMobileView = () => (
    <div className="mobile-view">
      <div className="mobile-content">
        <header>
          <h1 className="main-title">Paulina Liwanag</h1>
          <p className="subtitle">Tap a record to learn more about me!</p>
          <p className="subtitle">Visit the desktop version for more features 😊✌️</p>
        </header>

        <div className="vinyl-menu">
          {vinyls.map((vinyl, index) => (
            <div 
              key={index} 
              className="vinyl-wrapper"
              onClick={() => handleVinylClick(vinyl)}
            >
              <Vinyl
                title={vinyl.title}
                filePath={vinyl.filePath}
              />
              <span className="vinyl-hint">{vinyl.title}</span>
            </div>
          ))}
        </div>

        <Modal
          isOpen={!!selectedVinyl}
          onClose={() => setSelectedVinyl(null)}
          title={selectedVinyl?.title}
        >
          {selectedVinyl?.content}
        </Modal>
      </div>
    </div>
  );

  const renderDesktopView = () => (
    <div className={`app-container ${isDragging ? 'dragging-active' : ''}`}>
      <header>
        <h1 className="main-title">Paulina Liwanag</h1>
        <p className="subtitle">Drag a record onto the player to learn more about me!</p>
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
  );

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="animated-background"></div>
      {isMobile && (
        <button className="view-toggle" onClick={toggleView}>
          {showMobileView ? 'Switch to Record Player' : 'Switch to Mobile View'}
        </button>
      )}
      {showMobileView ? renderMobileView() : renderDesktopView()}
    </DndProvider>
  );
};

export default App;