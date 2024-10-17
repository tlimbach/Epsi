let videoTrack; // Speichert den Videotrack
let imageCapture; // Für die Bildaufnahme
const photoContainer = document.getElementById('photoContainer');
const output = document.getElementById('output');

// Startet den Kamerastream und richtet ImageCapture ein
function startCamera(facingMode = 'environment') {
    navigator.mediaDevices.getUserMedia({
        video: {
            facingMode: facingMode, // Rückseitige Kamera
            width: { ideal: 1280 }, // HD-Auflösung
            height: { ideal: 720 }  // HD-Auflösung
        }
    })
    .then(stream => {
        videoTrack = stream.getVideoTracks()[0];
        imageCapture = new ImageCapture(videoTrack);
        console.log('Kamera gestartet: ' + facingMode);
        output.innerText = 'Kamera gestartet.';
    })
    .catch(error => {
        console.log(`Kamera mit "${facingMode}" konnte nicht gestartet werden: ${error.message}`);
        output.innerText = `Kamera mit "${facingMode}" konnte nicht gestartet werden: ${error.message}`;
    });
}

// Nimmt ein Foto auf und zeigt es an
function takePhoto() {
    if (imageCapture) {
        imageCapture.takePhoto().then(blob => {
            const img = document.createElement('img');
            img.src = URL.createObjectURL(blob);

            // Ersetze das vorherige Foto durch das neue
            photoContainer.innerHTML = '';  // Lösche vorheriges Bild
            photoContainer.appendChild(img);

            output.innerText = "Neues Foto aufgenommen: " + new Date().toLocaleTimeString();
        }).catch(error => {
            console.error('Fehler beim Aufnehmen des Fotos:', error);
            output.innerText = "Fehler beim Aufnehmen des Fotos: " + error.message;
        });
    }
}

// Starte die Kamera beim Laden der Seite
startCamera();

// Nimm alle 1000 ms ein neues Foto auf
setInterval(takePhoto, 1000);