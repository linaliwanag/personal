import React from "react";
import 'boxicons';
import "./Content.css";
import { contentData } from "../contentData";

const Content = ({ trackTitle }) => {
    return (
        <div className="content-box">
            {contentData[trackTitle] ? (
                <>
                    <h2>{contentData[trackTitle].title}</h2>
                    {contentData[trackTitle].body}
                </>
            ) : (
                <div>
                    <h2>hi i'm paulina!</h2>
                    <p>drag a record onto the player to learn more about me!</p>
                </div>
            )}
        </div>
    );
};

export default Content;
