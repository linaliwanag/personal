import React from "react";
import 'boxicons';
import "./Content.css";

const Content = ({ trackTitle }) => {

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
                    Hi there! My name is Paulina Liwanag (“lee-wahn-uhg”) and I’m a software engineer. I currently work at JP Morgan Chase where my tasks are mainly in backend development. While I've appreciated the backend experience I've gained at JPMC, I prefer the frontend side of things. I'm either a really visual person, or I just like React more than Java ¯\_(ツ)_/¯
                    </p>
                    <p>
                    When I have the time (and the motivation!), I enjoy making things like this where I can continue to hone my skills and really explore my creativity. 
                    </p>
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
