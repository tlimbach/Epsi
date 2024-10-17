const photoContainer = document.getElementById('photoContainer');
const output = document.getElementById('output');

// Funktion zum Aufnehmen eines Fotos in HD-Qualität ohne Videostream
function takePhotoAndAnalyze(facingMode = 'environment') {
    navigator.mediaDevices.getUserMedia({
        video: {
            facingMode: facingMode,
            width: { ideal: 1280 },  // HD-Auflösung
            height: { ideal: 720 }   // HD-Auflösung
        }
    })
    .then(stream => {
        const videoTrack = stream.getVideoTracks()[0];
        const imageCapture = new ImageCapture(videoTrack);

        // Fotoaufnahme
        imageCapture.takePhoto().then(blob => {
            const img = document.createElement('img');
            img.src = URL.createObjectURL(blob);

            // Ersetze das vorherige Foto durch das neue
            photoContainer.innerHTML = '';  // Lösche vorherigen Inhalt
            photoContainer.appendChild(img);

            output.innerText = "Neues Foto aufgenommen: " + new Date().toLocaleTimeString();

            // Stream stoppen nach der Fotoaufnahme
            stream.getTracks().forEach(track => track.stop());
        }).catch(error => {
            console.error('Fehler beim Aufnehmen des Fotos:', error);
            output.innerText = "Fehler beim Aufnehmen des Fotos: " + error.message;
        });
    })
    .catch(error => {
        console.log(`Kamera mit "${facingMode}" konnte nicht gestartet werden: ${error.message}`);
        output.innerText = `Kamera mit "${facingMode}" konnte nicht gestartet werden: ${error.message}`;
    });
}

// Alle 1000 ms ein echtes Foto aufnehmen
setInterval(() => takePhotoAndAnalyze(), 1000);