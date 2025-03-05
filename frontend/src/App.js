import React, { useState, useEffect } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import RecordPlayer from "./components/RecordPlayer";
import Vinyl from "./components/Vinyl";
import Modal from "./components/Modal";
import 'boxicons';
import './App.css'

const vinyls = [
  { 
    id: 1, 
    title: "About", 
    filePath: "/assets/music/daisies.mp3",
    content: (
      <>
        <p>
          Hi there! My name is Paulina Liwanag ("lih-wahn-uhg") and I'm a software engineer. 
          I currently work at JP Morgan Chase where my tasks are mainly in backend development. 
          When I started programming in college, I preferred frontend/full-stack development, 
          so I enjoy working on side projects where I can continue to hone my skills and really 
          explore my creativity with that visual element.
        </p>
        <p>
          What you're looking at now has been a lot of fun to make–I got a record player for my 
          birthday last year and instantly got this idea; I'm happy to finally bring it to life. 
          In my spare time, I like to make music, like what you're listening to right now!
        </p>
      </>
    )
  },
  { 
    id: 2, 
    title: "Projects", 
    filePath: "/assets/music/can_i_call_this_bossa_nova.mp3",
    content: (
      <p>
        This is where you can find links to some of my personal projects (when I make more of them 😊)!
      </p>
    )
  },
  { 
    id: 3, 
    title: "Contact", 
    filePath: "/assets/music/good_enough.mp3",
    content: (
      <div className="contact-content">
        <p>Feel free to reach out 😊</p>
        <div className="contact-item">
          <a href="mailto:liwanag.paulina@gmail.com">
            <box-icon name="envelope" color="#ffffff"></box-icon>
          </a>
          <span>liwanag.paulina@gmail.com</span>
        </div>
        <div className="contact-item">
          <a href="https://www.linkedin.com/in/paulina-liwanag/" target="_blank" rel="noopener noreferrer">
            <box-icon name="linkedin-square" type="logo" color="#ffffff"></box-icon>
          </a>
          <span>paulina-liwanag</span>
        </div>
      </div>
    )
  }
];

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