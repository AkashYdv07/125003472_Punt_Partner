const startButton = document.getElementById('start-recording');
    const stopButton = document.getElementById('stop-recording');
    const resultDiv = document.getElementById('transcription-result');

    let ws;

    const startRecording = async () => {
      ws = new WebSocket('ws://localhost:3000');

      ws.onopen = () => {
        console.log('WebSocket connection opened');
        startButton.disabled = true;
        stopButton.disabled = false;

        navigator.mediaDevices.getUserMedia({ audio: true })
          .then(stream => {
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorder.ondataavailable = (event) => {
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(event.data);
              }
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
    };

    startButton.addEventListener('click', startRecording);