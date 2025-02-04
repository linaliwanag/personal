import React from "react";
import 'boxicons';
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
            text: "You can find me on LinkedIn at https://www.linkedin.com/in/paulina-liwanag/ or email me at liwanag.paulina@gmail.com",
        },
    };

    const contentData = {
        "Projects": {
            title: trackTitle,
            body: (
                <div>
                    <p>
                        This is where you can find links to some of my personal projects (when I make more of them 😊)!
                    </p>
                    {/* <ul>
                        <li>
                            <a href="https://github.com/yourgithub" target="_blank" rel="noopener noreferrer">
                                GitHub Repository
                            </a>
                        </li>
                        <li>
                            <a href="https://yourportfolio.com/projects" target="_blank" rel="noopener noreferrer">
                                Portfolio Projects
                            </a>
                        </li>
                    </ul> */}
                </div>
            ),
        },
        "About": {
            title: trackTitle,
            body: (
                <div>
                    <p>
                    Hi there! My name is Paulina Liwanag (“lih-wahn-uhg”) and I’m a software engineer. I currently work at JP Morgan Chase where my tasks are mainly in backend development. When I started programming in college, I preferred frontend/full-stack development, so I enjoy working on side projects where I can continue to hone my skills and really explore my creativity with that visual element. 
                    </p>
                    <p>What you’re looking at now has been a lot of fun to make–I got a record player for my birthday last year and instantly got this idea; I’m happy to finally bring it to life. In my spare time, I like to make music, like what you're listening to right now!</p>
                </div>
            ),
        },
        "Contact": {
            title: trackTitle,
            body: (
                <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
                    <p>Feel free to reach out 😊</p>
                    <p style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <a href="mailto:liwanag.paulina@gmail.com">
                        <box-icon name="envelope" color="#ffffff"></box-icon>
                        </a>
                        <span>liwanag.paulina@gmail.com</span>
                    </p>
                    <p style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <a href="https://www.linkedin.com/in/paulina-liwanag/" target="_blank" rel="noopener noreferrer">
                        <box-icon name="linkedin-square" type="logo" color="#ffffff"></box-icon>
                        </a>
                        <span>paulina-liwanag</span>
                    </p>
                </div>
            ),
        },
    };

    const content = contentMap[trackTitle] || {
        title: "hi i'm paulina!",
        text: "drop a record to learn more about me!",
    };

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
