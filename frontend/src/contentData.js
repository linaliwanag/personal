import React from 'react';

export const contentData = {
    "Projects": {
        title: "Projects",
        body: (
            <div>
                <p>
                    Here are some of my projects!
                </p>
                <div className="project-card">
                    <h3>Music Collagerator</h3>
                    <p>
                        A Spotify collage generator that visualizes your listening history and allows you to create beautiful collages from your favorite artists and albums.
                    </p>
                    <div className="project-features">
                        <span>• Visualize your top artists and tracks</span>
                        <span>• Customize time periods (last month, 6 months, all time)</span>
                        <span>• Choose from multiple grid layouts</span>
                        <span>• Download and share your collages</span>
                    </div>
                    <a href="https://music-collagerator.vercel.app/" target="_blank" rel="noopener noreferrer" className="project-link">
                            <box-icon name="link-external" color="#00b881"></box-icon>
                            Visit Music Collagerator
                        </a>
                </div>
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
        title: "About",
        body: (
            <div>
                <p>
                    Hi there! My name is Paulina Liwanag ("lee-wahn-uhg") and I'm a software engineer. I currently work at JP Morgan Chase where my tasks are mainly in backend development. While I've appreciated the backend experience I've gained at JPMC, I prefer the frontend side of things. I'm either a really visual person, or I just like React more than Java ¯\_(ツ)_/¯
                </p>
                <p>
                    When I have the time (and the motivation!), I enjoy making things like this where I can continue to hone my skills and really explore my creativity. 
                </p>
            </div>
        ),
    },
    "Contact": {
        title: "Contact",
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

export const vinyls = [
    { 
        id: 1, 
        title: "About", 
        filePath: "/assets/music/daisies.mp3",
        content: contentData["About"].body
    },
    { 
        id: 2, 
        title: "Projects", 
        filePath: "/assets/music/can_i_call_this_bossa_nova.mp3",
        content: contentData["Projects"].body
    },
    { 
        id: 3, 
        title: "Contact", 
        filePath: "/assets/music/good_enough.mp3",
        content: contentData["Contact"].body
    }
]; 