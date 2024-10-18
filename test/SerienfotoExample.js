let isProcessing = false;
let totalTime = 0;
let count = 0;
let zuletztDatenMuellerkannt = true;

let originalImageBlob; // Variable zum Speichern des Originalbildes (Blob)

function takePhoto() {
    if (isProcessing) {
        return;
    }

    isProcessing = true;

    const width = 1920; // FullHD (Originalauflösung)
    const height = 1080; // FullHD (Originalauflösung)

    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: width }, height: { ideal: height } } })
        .then(stream => {
            const track = stream.getVideoTracks()[0];
            const imageCapture = new ImageCapture(track);
            imageCapture.takePhoto()
                .then(blob => {
                    originalImageBlob = blob; // Speichert das Original-Bild (Blob)

                    const imgURL = URL.createObjectURL(blob);
                    const img = new Image();
                    img.src = imgURL;
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        const context = canvas.getContext('2d');

                        let scaledWidth = 800;
                        let scaledHeight = 600;

                        if (img.width < img.height) {
                            scaledWidth = 600;
                            scaledHeight = 800;
                        }

                        canvas.width = scaledWidth;
                        canvas.height = scaledHeight;
                        context.drawImage(img, 0, 0, scaledWidth, scaledHeight);

                        const croppedCanvas = document.createElement('canvas');
                        const croppedContext = croppedCanvas.getContext('2d');
                        if (img.width < img.height) {
                            croppedCanvas.width = canvas.width;
                            croppedCanvas.height = canvas.height * 0.4;
                            croppedContext.drawImage(canvas, 0, canvas.height * 0.3, canvas.width, canvas.height * 0.4, 0, 0, croppedCanvas.width, croppedCanvas.height);
                        } else {
                            croppedCanvas.width = canvas.width;
                            croppedCanvas.height = canvas.height * 0.7;
                            croppedContext.drawImage(canvas, 0, canvas.height * 0.15, canvas.width, canvas.height * 0.7, 0, 0, croppedCanvas.width, croppedCanvas.height);
                        }

                        photo.src = croppedCanvas.toDataURL('image/jpeg', 0.7);
                        photo.style.width = '100%';

                        convertToGrayscale(croppedCanvas);

                        const base64Data = croppedCanvas.toDataURL('image/jpeg', 0.7);

                        checkWithTesseract(base64Data).then(isTextFound => {
                            if (isTextFound) {
                                if (zuletztDatenMuellerkannt) {
                                    zuletztDatenMuellerkannt = false;

                                    createBase64FromBlob(originalImageBlob).then(base64ForOCR => {
                                        checkWithOCRSpace(base64ForOCR).finally(() => {
                                            isProcessing = false;
                                        });
                                    }).catch(err => {
                                        console.error('Fehler beim Erstellen von Base64 für OCR:', err);
                                        isProcessing = false; // Bei Fehler ebenfalls zurücksetzen
                                    });
                                } else {
                                    console.log('Immer noch altes Bild.');
                                    isProcessing = false;
                                }
                            } else {
                                zuletztDatenMuellerkannt = true;
                                console.log('Kein Text erkannt.');
                                isProcessing = false;
                            }
                        }).catch(err => {
                            console.error('Fehler bei der Texterkennung: ' + err);
                            isProcessing = false; // Fehlerfall
                        });

                        stream.getTracks().forEach(track => track.stop());
                    };
                })
                .catch(error => {
                    console.error('Fotoaufnahme fehlgeschlagen:', error);
                    isProcessing = false; // Bei Fehler auf false setzen
                });
        })
        .catch(error => {
            console.error('Kamera konnte nicht gestartet werden:', error);
            isProcessing = false; // Fehler bei Kamera
        });
}

// Weitere Funktionen bleiben gleich

// Foto alle 2000ms
setInterval(takePhoto, 100);
