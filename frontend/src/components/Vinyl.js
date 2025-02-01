import React from "react";
import { useDrag } from "react-dnd";

const Vinyl = ({ vinyl }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: "VINYL",
    item: { id: vinyl.id, title: vinyl.title, embedUrl: vinyl.embedUrl },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  return (
    <div
      ref={drag}
      style={{
        opacity: isDragging ? 0.5 : 1,
        cursor: "grab",
        padding: "10px",
        border: "1px solid black",
        borderRadius: "50%",
        width: "100px",
        height: "100px",
        background: "black",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
      }}
    >
      {vinyl.title}
    </div>
  );
};

export default Vinyl;
