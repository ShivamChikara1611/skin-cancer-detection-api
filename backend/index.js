require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const cors = require("cors");
const { Blob } = require("buffer");
const FormData = require("form-data"); // Add form-data package

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect("mongodb://127.0.0.1:27017/cancer", {
  // useNewUrlParser: true,
  // useUnifiedTopology: true
}).then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB connection error:", err));

// Define Schema
const imageSchema = new mongoose.Schema({
  filename: String,
  data: Buffer,
  contentType: String,
  prediction: String,
  confidence: Number,
  timestamp: { type: Date, default: Date.now }
});

const Image = mongoose.model("Image", imageSchema);

// Multer configuration for file upload
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Dynamic import for node-fetch version 3+
let fetch;

(async () => {
  fetch = (await import('node-fetch')).default;
})();

// Upload and Predict Endpoint
app.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  try {
    // Convert buffer to Blob (Node.js environment)
    const fileBlob = new Blob([req.file.buffer], { type: req.file.mimetype });

    // Create FormData and append the Blob
    const formData = new FormData();
    formData.append("file", req.file.buffer, req.file.originalname);
    

    // Send the file to the prediction API
    const response = await fetch("http://127.0.0.1:7860/predict", {
        method: "POST",
        body: formData,
        headers: formData.getHeaders() // This ensures correct headers
    });

    if (!response.ok) {
      throw new Error("Prediction API failed");
    }

    const predictionData = await response.json();

    // Store image & prediction result in MongoDB
    const newImage = new Image({
      filename: req.file.originalname,
      data: req.file.buffer,
      contentType: req.file.mimetype,
      prediction: predictionData.prediction,
      confidence: predictionData.confidence,
    });

    await newImage.save();
    res.json({ message: "File uploaded & prediction saved", predictionData });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/", (req, res) => {
  res.send("Hello, this is from server side:");
});

// Start server
app.listen(3000, () => console.log("Server running on port 3000"));
