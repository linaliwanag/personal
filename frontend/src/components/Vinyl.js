import React from "react";
import { useDrag } from "react-dnd";

const Vinyl = ({ title, videoId, onDoubleClick }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: "VINYL",
    item: { videoId, title },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  return (
    <div
      ref={drag}
      onDoubleClick={() => onDoubleClick(videoId, title)} // Handle double-click
      style={{
        width: "100px",
        height: "100px",
        borderRadius: "50%",
        // backgroundColor: isDragging ? "darkgray" : "black",
        backgroundColor: "black",
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        margin: "10px",
        cursor: "grab",
      }}
    >
      {title}
    </div>
  );
};

export default Vinyl;
