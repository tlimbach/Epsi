let isProcessing = false;
let totalTime = 0;
let count = 0;

function takePhoto() {
    if (isProcessing) return;

    isProcessing = true;

    const width = 1920; // FullHD (Originalauflösung)
    const height = 1080; // FullHD (Originalauflösung)

    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: width }, height: { ideal: height } } })
        .then(stream => {
            const track = stream.getVideoTracks()[0];
            const imageCapture = new ImageCapture(track);
            imageCapture.takePhoto()
                .then(blob => {
                    textOutput.innerHTML = '';

                    const imgURL = URL.createObjectURL(blob);

                    const img = new Image();
                    img.src = imgURL;
                    img.onload = () => {
                        // Erst auf HD runterskalieren
                        const canvas = document.createElement('canvas');
                        const context = canvas.getContext('2d');
                        canvas.width = 1280; // HD-Breite
                        canvas.height = 720; // HD-Höhe

                        // Skaliere das Bild auf HD-Größe
                        context.drawImage(img, 0, 0, 1280, 720);

                        // Zuschneiden des Bildes um 20% oben und unten (HD-Bild)
                        const croppedCanvas = document.createElement('canvas');
                        const croppedContext = croppedCanvas.getContext('2d');
                        croppedCanvas.width = canvas.width; // HD-Breite
                        croppedCanvas.height = canvas.height * 0.6; // 60% der HD-Höhe

                        // Zeichne nur den mittleren 60%-Bereich des Bildes
                        croppedContext.drawImage(canvas, 0, canvas.height * 0.2, canvas.width, canvas.height * 0.6, 0, 0, croppedCanvas.width, croppedCanvas.height);

                        let compressionFactor = 0.5;

                        /// Zeige das zugeschnittene Bild auf der Seite an
                        photo.src = croppedCanvas.toDataURL('image/jpeg', compressionFactor); // 70% Qualität
                        photo.style.width = '800px'; // Zeige es in 800px Breite an

                        // Zeige die Auflösung und Dateigröße
                        console.log(`Foto-Auflösung: ${croppedCanvas.width}x${croppedCanvas.height}`);
                        textOutput.innerHTML += `Foto-Auflösung: ${croppedCanvas.width}x${croppedCanvas.height} (nach Skalierung)<br>`;

                        // Komprimiere das Bild für Tesseract
                        const compressedImageData = croppedCanvas.toDataURL('image/jpeg', compressionFactor); // 70% Qualität für Tesseract

                        fetch(compressedImageData)
                        .then(res => res.blob())
                        .then(blob => {
                            const fileSizeKB = (blob.size / 1024).toFixed(2);
                            textOutput.innerHTML += `Dateigröße (komprimiert): ${fileSizeKB} KB<br>`;
                        });

                        // Sende das komprimierte Bild an Tesseract
                        processWithTesseract(compressedImageData);
                    };

                    stream.getTracks().forEach(track => track.stop());
                })
                .catch(error => {
                    console.error('Fotoaufnahme fehlgeschlagen:', error);
                    isProcessing = false;
                });
        })
        .catch(error => {
            console.error('Kamera konnte nicht gestartet werden:', error);
            isProcessing = false;
        });
}

function processWithTesseract(imageData) {
    const startTime = performance.now();

    Tesseract.recognize(imageData, 'deu', { logger: m => console.log(m) })
        .then(({ data: { text } }) => {
            count++;
            const endTime = performance.now();
            const recognitionTime = (endTime - startTime).toFixed(2);
            totalTime += parseFloat(recognitionTime);

            const avgTime = (totalTime / count).toFixed(2);
            textOutput.innerHTML += `Erkennungszeit: ${recognitionTime} ms<br>`;
            textOutput.innerHTML += `Durchschnittliche Erkennungszeit: ${avgTime} ms<br>`;
            textOutput.innerHTML += 'Erkannter Text: ' + text + '<br>';
        })
        .catch(err => {
            textOutput.innerHTML += 'Fehler bei der Texterkennung: ' + err + '<br>';
        })
        .finally(() => {
            isProcessing = false;
        });
}

// Foto alle 2500ms
setInterval(takePhoto, 2500);
