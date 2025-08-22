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
                        I love building projects that combine creativity, interactivity, and a bit of fun. Here are a couple I’m proud of:
                    </p>
                    <ul style={{ paddingLeft: "1rem", marginTop: "0.5rem" }}>
                        <li style={{ marginBottom: "0.75rem" }}>
                            <strong>🎨 Classi</strong> – A Baldur’s Gate 3 class builder and level-up assistant powered by AI.
                            <div>
                                <img
                                    src="/assets/images/classi-preview.png"
                                    alt="Screenshot of Classi app"
                                    className="project-screenshot"
                                />
                            </div>
                            <a
                                href="https://classi-mu.vercel.app/"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Build Your Character!
                            </a>{" "}
                            |{" "}
                            <a
                                href="https://github.com/linaliwanag/classi"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                View on GitHub
                            </a>
                            <br />
                            <p>
                                This project was built with React, TypeScript, and Tailwind CSS. It uses the OpenRouter API to generate character descriptions. It was a fun way to learn about the OpenRouter API and how to use it in a project! It's a little slow as I am using the free model, but it works!
                            </p>
                        </li>
                        <br />
                        <li>
                            <strong>📸 Music Collage Maker</strong> – A fullstack app that generates Spotify collages based on your top artists or albums.
                            <div>
                                <img
                                    src="/assets/images/music-collagerator-preview.png"
                                    alt="Screenshot of Classi app"
                                    className="project-screenshot"
                                />
                            </div>
                            <a
                                href="https://music-collagerator.vercel.app/"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Check It Out!
                            </a>{" "}
                            |{" "}
                            <a
                                href="https://github.com/linaliwanag/music-collagerator"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                View on GitHub
                            </a>
                            <br />
                            <p>
                                This project was built with React, TypeScript, and Tailwind CSS. It uses the Spotify API to get your top artists or albums and then generates a collage of the artists or albums. Currently, due to some API limitations, it's only configured to work for a couple of users, but I'm working on making it accessible to and usable by everyone!
                            </p>
                        </li>
                    </ul>
                </div>
            ),
        },
        "About": {
            title: trackTitle,
            body: (
                <div>
                    <p>
                        Hello! I'm Paulina Liwanag, a software engineer currently working at JPMorgan Chase with a focus on backend development. While I've gained valuable experience building backend systems, I have a strong interest in frontend development and enjoy working with technologies like React to create engaging, user-friendly interfaces.
                    </p>
                    <p>
                        In my free time, I enjoy building creative side projects like this one to sharpen my skills, experiment with new tools, and bring my ideas to life.
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
        <>
            {contentData[trackTitle] ? (
                <div className="content-box">
                    <h2>{contentData[trackTitle].title}</h2>
                    {contentData[trackTitle].body}
                </div>
            ) : null}
        </>
    );
};

export default Content;
