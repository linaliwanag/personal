const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors()); // Enable CORS so frontend can access the backend
app.use(express.json()); // Handle JSON requests
app.use(express.static(path.join(__dirname, "public"))); // Serve static files

// Serve audio files dynamically
app.get("/api/music/:filename", (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(__dirname, "public", "assets", "music", filename);

  res.sendFile(filePath, (err) => {
    if (err) {
      res.status(404).json({ error: "File not found" });
    }
  });
});

// API Health Check
app.get("/", (req, res) => {
  res.json({ message: "Server is running" });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
