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
                        Here are some of my projects!
                    </p>
                    <div className="project-card">
                        <h3>Music Collagerator</h3>
                        <p>
                            A Spotify collage generator that visualizes your listening history. Create beautiful collages from your favorite artists and albums, customize time periods, and share your music taste with the world.
                        </p>
                        <div className="project-features">
                            <span>✓ Top artists & tracks visualization</span>
                            <span>✓ Customizable time periods</span>
                            <span>✓ Multiple grid layouts</span>
                            <span>✓ Download & share your collages</span>
                        </div>
                        <a href="https://music-collagerator.vercel.app/" target="_blank" rel="noopener noreferrer" className="project-link">
                            <box-icon name="link-external" color="#00b881"></box-icon>
                            Visit Music Collagerator
                        </a>
                    </div>
                    <p className="more-projects">
                        More projects coming soon! 😊
                    </p>
                </div>
            ),
        },
        "About": {
            title: trackTitle,
            body: (
                <div>
                    <p>
                    Hi there! My name is Paulina Liwanag ("lih-wahn-uhg") and I'm a software engineer. I currently work at JP Morgan Chase where my tasks are mainly in backend development. When I started programming in college, I preferred frontend/full-stack development, so I enjoy working on side projects where I can continue to hone my skills and really explore my creativity with that visual element. 
                    </p>
                    <p>What you're looking at now has been a lot of fun to make–I got a record player for my birthday last year and instantly got this idea; I'm happy to finally bring it to life. In my spare time, I like to make music, like what you're listening to right now!</p>
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
