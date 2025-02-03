import React from "react";
import "./Content.css";

const Content = ({ trackTitle }) => {
    // todo: update map structure. works for now but i don't like it
    // todo: put data elsewhere lol
    const contentMap = {
        "About": {
            title: trackTitle,
            text: "Hi there! My name is Paulina Liwanag (“lih-wahn-ig”) and I’m a software engineer. I currently work at JP Morgan Chase where my tasks are mainly in backend development. When I started programming, I preferred frontend/full-stack development, so I really enjoy working on side projects where I can continue to hone my skills and really explore my creativity. What you’re looking at now has been a lot of fun to make–I got a record player for my birthday last year and instantly got this idea; I’m happy to finally bring it to life. In my spare time, I like to make music, like what you're listening to right now!",
        },
        "Projects": {
            title: trackTitle,
            text: "This is where you can find links to some of my personal projects (when I make more of them 😊)!",
        },
        "Contact": { // todo: add hyperlinks for these
            title: trackTitle,
            text: "Here are a few ways to get in touch with me! You can find me on LinkedIn at https://www.linkedin.com/in/paulina-liwanag/ or email me at liwanag.paulina@gmail.com",
        },
    };

    const content = contentMap[trackTitle] || {
        title: "hi i'm paulina!",
        text: "drop a record to learn more about me!",
    };

    return (
        <div className="content-box">
            <h2>{content.title}</h2>
            <p>{content.text}</p>
        </div>
    );
};

export default Content;
