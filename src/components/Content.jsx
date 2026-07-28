import React from "react";
import "./Content.css";

// Purely presentational -- the copy itself lives with the rest of the record's
// data in src/records.jsx.
const Content = ({ record }) => {
    if (!record) return null;

    return (
        <div className="content-box">
            <h2>{record.title}</h2>
            {record.body}
        </div>
    );
};

export default Content;
