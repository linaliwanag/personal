import React from "react";
import { useDrag } from "react-dnd";
import "./Vinyl.css";

const Vinyl = ({ title, filePath, isOnPlayer = false }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: "VINYL",
    item: { title, filePath },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  // Generate a color based on the title for some visual differentiation
  const getVinylColor = () => {
    switch (title) {
      case "About": return "linear-gradient(145deg, #343465, #443499)";
      case "Projects": return "linear-gradient(145deg, #653434, #994434)";
      case "Contact": return "linear-gradient(145deg, #346534, #449934)";
      default: return "linear-gradient(145deg, #444, #222)";
    }
  };

  return (
    <div
      ref={drag}
      className={`vinyl-record ${isDragging ? 'dragging' : ''} ${isOnPlayer ? 'on-player' : ''}`}
      style={{
        background: getVinylColor(),
      }}
    >
      <div className="vinyl-grooves"></div>
    </div>
  );
};

export default Vinyl;
