const startButton = document.getElementById('start-recording');
const stopButton = document.getElementById('stop-recording');
const resultDiv = document.getElementById('text-speech-container');

let ws;
let mediaRecorder;
let stream;

const startRecording = async () => {
  try {
    // Open WebSocket connection
    ws = new WebSocket('ws://localhost:3000');

    ws.onopen = () => {
      console.log('WebSocket connection opened');
      startButton.disabled = true;
      stopButton.disabled = false;

      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(userStream => {
          stream = userStream;
          mediaRecorder = new MediaRecorder(stream);

          mediaRecorder.ondataavailable = (event) => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(event.data);
            }
          };

          mediaRecorder.onerror = (error) => {
            console.error('MediaRecorder Error:', error);
          };

          mediaRecorder.start(1000); // Send audio data every 1 second

          stopButton.onclick = () => {
            mediaRecorder.stop();
            stream.getTracks().forEach(track => track.stop());
            ws.close();
            startButton.disabled = false;
            stopButton.disabled = true;
          };
        })
        .catch(error => console.error('Media Device Error:', error));
    };

    ws.onmessage = (message) => {
      resultDiv.innerText = `Transcription: ${message.data}`;
    };

    ws.onerror = (error) => {
      console.error('WebSocket Error:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket connection closed');
    };
  } catch (error) {
    console.error('Error starting recording:', error);
  }
};

startButton.addEventListener('click', startRecording);
