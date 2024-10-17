const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const context = canvas.getContext('2d');
const photoElement = document.getElementById('photo'); // Das <img> Element für die Fotos

// Funktion zum Starten des Kamerastreams
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
        video.play();

        // Alle 100ms ein neues Foto aufnehmen
        setInterval(capturePhoto, 100);
    })
    .catch(err => {
        console.error('Error accessing the camera: ' + err);
    });
}

// Funktion zum Aufnehmen des Fotos und Anzeigen im <img> Tag
function capturePhoto() {
    // Vergewissere dich, dass das Video verfügbar ist
    if (video.videoWidth > 0 && video.videoHeight > 0) {
        // Setze die Canvas-Größe basierend auf dem Video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Zeichne das aktuelle Bild vom Video auf das Canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Konvertiere das Canvas-Bild zu einem Bild im Base64-Format
        const imgData = canvas.toDataURL('image/png');

        // Ersetze das Bild im <img> Element mit dem aktuellen Bild
        photoElement.src = imgData;
    }
}

// Starte den Kamerastream und wiederhole die Fotoaufnahme alle 100ms
startVideoStream();