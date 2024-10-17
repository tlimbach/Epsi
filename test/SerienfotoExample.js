const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const context = canvas.getContext('2d');
const photoElement = document.getElementById('photo'); // Hier wird das Bild eingefügt

function startVideoStream(facingMode = 'environment') {
    navigator.mediaDevices.getUserMedia({
        video: {
            facingMode: facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 }
        }
    })
    .then(stream => {
        video.srcObject = stream;

        // Alle 100ms ein Foto machen
        setInterval(capturePhoto, 100);
    })
    .catch(err => {
        console.error('Error accessing the camera: ' + err);
    });
}

function capturePhoto() {
    // Setze Canvas Größe entsprechend des Videos
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Zeichne das aktuelle Video-Bild auf das Canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Konvertiere Canvas in ein Bild
    const imgData = canvas.toDataURL('image/png');

    // Setze das Bild als Quelle für das <img> Tag
    photoElement.src = imgData;
}

// Starte den Video-Stream
startVideoStream();