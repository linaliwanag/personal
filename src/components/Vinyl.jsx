import React from "react";
import { useDrag } from "react-dnd";
import { getVinylColor } from "../vinylColors";
import "./Vinyl.css";

const Vinyl = ({ title, filePath, isOnPlayer = false }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: "VINYL",
    item: { title, filePath },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  return (
    <div
      ref={drag}
      className={`vinyl-record ${isDragging ? 'dragging' : ''} ${isOnPlayer ? 'on-player' : ''}`}
      style={{
        background: getVinylColor(title),
      }}
    >
      <div className="vinyl-grooves"></div>
    </div>
  );
};

export default Vinyl;
