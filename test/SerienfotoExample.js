window.onload = function () {
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const photoDiv = document.getElementById('photo-div');
    const context = canvas.getContext('2d');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('getUserMedia wird nicht unterstützt!');
        return;
    }

    // Zugriff auf die Rückkamera des iPhones
    navigator.mediaDevices.getUserMedia({
        video: {
            facingMode: 'environment', // Rückseitige Kamera
            width: { ideal: 1280 },    // HD-Auflösung
            height: { ideal: 720 }     // HD-Auflösung
        }
    })
    .then(stream => {
        video.srcObject = stream; // Kamera stream in Video Element
        video.play();

        // Intervall für Fotos alle 100ms
        setInterval(() => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            // Das Bild auf das Canvas zeichnen
            context.drawImage(video, 0, 0, canvas.width, canvas.height);

            // Foto als Base64-Bilddaten
            const photoData = canvas.toDataURL('image/png');

            // Füge das Bild in das Div ein
            const img = document.createElement('img');
            img.src = photoData;
            photoDiv.innerHTML = ''; // Optional: Entferne vorherige Bilder
            photoDiv.appendChild(img); // Füge das neue Bild hinzu
        }, 100); // Alle 100ms ein neues Foto machen
    })
    .catch(error => {
        console.error('Fehler beim Zugriff auf die Kamera:', error);
    });
};