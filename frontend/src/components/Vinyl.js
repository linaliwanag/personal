import React from "react";
import { useDrag } from "react-dnd";

const Vinyl = ({ id, title, videoId }) => {
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
      style={{
        width: "100px",
        height: "100px",
        borderRadius: "50%",
        backgroundColor: isDragging ? "darkgray" : "black",
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
