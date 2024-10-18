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
                        let scaledWidth = 800;
                        let scaledHeight = 600;

                        // Dynamische Anpassung basierend auf der tatsächlichen Ausrichtung
                        if (img.width < img.height) {
                            // Hochkant: 35% oben und unten weg
                            scaledWidth = 600;
                            scaledHeight = 800;
                        }

                        canvas.width = scaledWidth;
                        canvas.height = scaledHeight;

                        // Skaliere das Bild
                        context.drawImage(img, 0, 0, scaledWidth, scaledHeight);

                        // In Graustufen konvertieren
                        convertToGrayscale(canvas);

                        // Zuschneiden des Bildes um 20% oder 35% oben und unten
                        const croppedCanvas = document.createElement('canvas');
                        const croppedContext = croppedCanvas.getContext('2d');
                        if (img.width < img.height) {
                            // Hochkant
                            croppedCanvas.width = canvas.width;
                            croppedCanvas.height = canvas.height * 0.3; // 30% der Hochkant-Höhe bleibt
                            croppedContext.drawImage(canvas, 0, canvas.height * 0.35, canvas.width, canvas.height * 0.3, 0, 0, croppedCanvas.width, croppedCanvas.height);
                        } else {
                            // Querformat
                            croppedCanvas.width = canvas.width;
                            croppedCanvas.height = canvas.height * 0.6; // 60% der HD-Höhe bleibt
                            croppedContext.drawImage(canvas, 0, canvas.height * 0.2, canvas.width, canvas.height * 0.6, 0, 0, croppedCanvas.width, croppedCanvas.height);
                        }

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

function convertToGrayscale(canvas) {
    const context = canvas.getContext('2d');
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        const grayscale = data[i] * 0.3 + data[i + 1] * 0.59 + data[i + 2] * 0.11;
        data[i] = data[i + 1] = data[i + 2] = grayscale;
    }
    context.putImageData(imageData, 0, 0);
}

function processWithTesseract(imageData) {
    const startTime = performance.now();

    Tesseract.recognize(imageData, 'deu', {
        //tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789€.,%gGkKmL+-',
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
        //tessedit_pageseg_mode: Tesseract.PSM.AUTO, // Automatische Segmentierung für mehrere Textblöcke
        tessedit_pageseg_mode: Tesseract.PSM.SINGLE_LINE, // Automatische Segmentierung für mehrere Textblöcke
        logger: m => console.log(m)
    })
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
setInterval(takePhoto, 1000);
