let photoInterval;
let imageCapture;

async function startPhotoCapture(facingMode = 'environment') {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: facingMode, width: { ideal: 1280 }, height: { ideal: 720 } }
        });

        const videoTrack = stream.getVideoTracks()[0];
        imageCapture = new ImageCapture(videoTrack);

        // Alle 100ms ein Foto machen
        photoInterval = setInterval(capturePhoto, 100);

    } catch (error) {
        console.error('Kamera konnte nicht gestartet werden:', error);
    }
}

async function capturePhoto() {
    try {
        const photoContainer = document.getElementById('photoContainer');
        const blob = await imageCapture.takePhoto();
        const imgURL = URL.createObjectURL(blob);

        // Füge das Foto zum Container hinzu
        const imgElement = document.createElement('img');
        imgElement.src = imgURL;
        photoContainer.appendChild(imgElement);

    } catch (error) {
        console.error('Fehler beim Aufnehmen des Fotos:', error);
    }
}

// Start der Fotoaufnahme
startPhotoCapture();