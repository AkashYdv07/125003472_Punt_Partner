const { createClient } = require("@deepgram/sdk");
const express = require("express");
const http = require("http");
const fs = require("fs");
const dotenv = require("dotenv");
const path = require("path");
const formidable = require("formidable");

dotenv.config();

const app = express();
const server = http.createServer(app);
app.use(express.json());

const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

app.use(express.static("public/"));
app.use("/audio", express.static("audio"));

// Text-to-Speech API
app.post("/api", async (req, res) => {
  const { body } = req;
  const { text, model } = body;

  try {
    const filePath = await getAudio(text, model);
    res.json({ audioUrl: filePath });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

const getAudio = async (text, model) => {
  const response = await deepgram.speak.request({ text }, { model });
  const stream = await response.getStream();

  if (stream) {
    const buffer = await getAudioBuffer(stream);

    try {
      // Ensure 'audio' directory exists
      const audioDirectory = path.join(__dirname, "audio");
      if (!fs.existsSync(audioDirectory)) {
        fs.mkdirSync(audioDirectory);
      }

      // Write audio file to 'audio' directory
      await new Promise((resolve, reject) => {
        fs.writeFile(path.join(audioDirectory, "audio.wav"), buffer, (err) => {
          if (err) {
            console.error("Error writing audio to file:", err);
            reject(err);
          } else {
            console.log("Audio file written to audio.wav");
            resolve();
          }
        });
      });
    } catch (err) {
      throw err;
    }

    return "/audio/audio.wav";
  } else {
    console.error("Error generating audio:", stream);
    throw new Error("Error generating audio: Stream is empty");
  }
};

// Speech-to-Text API
app.post("/transcribe", (req, res) => {
  const form = new formidable.IncomingForm();
  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Internal Server Error");
    }

    const audioFile = files.audio[0].path;

    try {
      const response = await deepgram.transcription.preRecorded(
        { buffer: fs.createReadStream(audioFile) },
        { punctuate: true, language: 'en-US' }
      );
      const transcription = response.results.channels[0].alternatives[0].transcript;
      fs.unlinkSync(audioFile); // Remove the file after processing
      res.json({ transcript: transcription });
    } catch (err) {
      console.error(err);
      res.status(500).send("Internal Server Error");
    }
  });
});

const getAudioBuffer = async (response) => {
  const reader = response.getReader();
  const chunks = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    chunks.push(value);
  }

  const dataArray = chunks.reduce(
    (acc, chunk) => Uint8Array.from([...acc, ...chunk]),
    new Uint8Array(0)
  );

  return Buffer.from(dataArray.buffer);
};

// Serve the index.html file on root path
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "/public/index.html"));
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
