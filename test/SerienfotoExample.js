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
                        const canvas = document.createElement('canvas');
                        const context = canvas.getContext('2d');

                        const aspectRatio = img.width / img.height;
                        let scaledWidth = 1280;
                        let scaledHeight = 720;

                        // Dynamische Anpassung basierend auf der tatsächlichen Ausrichtung
                        if (img.width < img.height) {
                            // Hochkant
                            scaledWidth = 720;
                            scaledHeight = 1280;
                        }

                        canvas.width = scaledWidth;
                        canvas.height = scaledHeight;

                        // Skaliere das Bild
                        context.drawImage(img, 0, 0, scaledWidth, scaledHeight);

                        // Zuschneiden des Bildes um 20% oben und unten
                        const croppedCanvas = document.createElement('canvas');
                        const croppedContext = croppedCanvas.getContext('2d');
                        croppedCanvas.width = canvas.width;
                        croppedCanvas.height = canvas.height * 0.6;

                        // Zeichne nur den mittleren 60%-Bereich des Bildes
                        croppedContext.drawImage(canvas, 0, canvas.height * 0.2, canvas.width, canvas.height * 0.6, 0, 0, croppedCanvas.width, croppedCanvas.height);

                        // Zeige das zugeschnittene Bild auf der Seite an
                        photo.src = croppedCanvas.toDataURL('image/jpeg', 0.7); // 70% Qualität
                        photo.style.width = '100%'; // Passt das Bild an den Bildschirm an

                        // Zeige die Auflösung und Dateigröße
                        textOutput.innerHTML += `Foto-Auflösung: ${croppedCanvas.width}x${croppedCanvas.height} (nach Skalierung)<br>`;
                        const fileSizeKB = (blob.size / 1024).toFixed(2);
                        textOutput.innerHTML += `Dateigröße: ${fileSizeKB} KB<br>`;

                        // Komprimiere das Bild für Tesseract
                        const compressedImageData = croppedCanvas.toDataURL('image/jpeg', 0.7);

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
