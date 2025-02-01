import React from "react";
import "./Content.css";

const Content = ({ trackTitle }) => {
    // todo: update map structure. works for now but i don't like it
    const contentMap = {
        "About": {
            title: trackTitle,
            text: "Hi there! My name is Paulina Liwanag (“lih-wahn-ig”) and I’m a software engineer. I currently work at JP Morgan Chase where my tasks are mainly in backend development. When I started programming, I preferred frontend/full-stack development, so I really enjoy working on side projects where I can continue to hone my skills and really explore my creativity. What you’re looking at now has been a lot of fun to make–I got a record player for my birthday last year and instantly got this idea; I’m happy to finally bring it to life. Hope you enjoy the music!",
        },
        "Projects": {
            title: trackTitle,
            text: "This is where my projects will be (when I make more of them 😊)!",
        },
        "Contact": {
            title: trackTitle,
            text: "Here are a few ways to get in touch with me! My preferred method of contact is via email :)",
        },
    };

    const content = contentMap[trackTitle] || {
        title: "Welcome!",
        text: "Drop a record to learn more about me!",
    };

    return (
        <div className="content-box">
            <h2>{content.title}</h2>
            <p>{content.text}</p>
        </div>
    );
};

export default Content;
