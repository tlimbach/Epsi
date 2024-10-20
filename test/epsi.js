let isProcessing = false;
let totalTime = 0;
let count = 0;
let zuletztDatenMuellerkannt = true;

let originalImageBlob; // Variable zum Speichern des Originalbildes (Blob)
let imageLocked = false; // Sperre, wenn Text erkannt wurde

function takePhoto() {
    if (isProcessing) {
        return; // Verhindere, dass die Verarbeitung startet, wenn bereits eine läuft
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

                        // Wenn das Bild nicht gesperrt ist, aktualisiere es
                       // if (!imageLocked) 
                        {
                            photo.src = croppedCanvas.toDataURL('image/jpeg', 0.7);
                        }
                        photo.style.width = '100%';

                        convertToGrayscale(croppedCanvas);

                        const base64Data = croppedCanvas.toDataURL('image/jpeg', 0.7);

                        checkWithTesseract(base64Data).then(isTextFound => {
                            if (isTextFound) {
                                if (zuletztDatenMuellerkannt) {
                                    zuletztDatenMuellerkannt = false;

                                    // Sperre das Bild für 3 Sekunden
                                    imageLocked = true;
                                    setTimeout(() => {
                                        imageLocked = false; // Nach 3 Sekunden Bild entsperren
                                    }, 3000);

                                    // Starte OCR.Space nach Tesseract-Erkennung
                                    createBase64FromBlob(originalImageBlob).then(base64ForOCR => {
                                        checkWithOCRSpace(base64ForOCR).finally(() => {
                                            isProcessing = false; // Verarbeitungsflag zurücksetzen
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
                                setBackgroundColor('gray');
                                zuletztDatenMuellerkannt = true;
                                console.log('Kein Text erkannt.');
                                isProcessing = false;
                            }
                        });
                        stream.getTracks().forEach(track => track.stop());
                    };
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

function checkWithTesseract(imageData) {
    const startTime = performance.now(); // Startzeit

    return Tesseract.recognize(imageData, 'deu', {
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789€.,%gGkKmL+-',
        tessedit_pageseg_mode: Tesseract.PSM.SINGLE_LINE,
        logger: m => { }
    }).then(({ data: { text } }) => {
        const endTime = performance.now(); // Endzeit
        const recognitionTime = (endTime - startTime).toFixed(2); // Zeitdifferenz in ms
        console.log(`Tesseract Erkennung dauerte: ${recognitionTime} ms`);

        count++;
        totalTime += parseFloat(recognitionTime);

        const avgTime = (totalTime / count).toFixed(2);

        if (text.match(/\w{7,}/)) {
            return true; // Text gefunden
        } else {
            return false; // Kein Text gefunden
        }
    }).catch(err => {
        console.error('Fehler bei der Tesseract Texterkennung: ' + err);
    });
}

function createBase64FromBlob(blob) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const imgURL = URL.createObjectURL(blob);

        img.src = imgURL;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');

            // Kleinere Auflösung für bessere Leistung
            let w = 1280;
            let h = 720;

            let scaledWidth = w;
            let scaledHeight = h;

            if (img.width < img.height) {
                scaledWidth = h;
                scaledHeight = w;
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

            // Reduziere die Bildqualität auf 70% (0.7)
            const base64Data = croppedCanvas.toDataURL('image/jpeg', 0.7);
            resolve(base64Data);
        };

        img.onerror = (err) => {
            reject('Fehler beim Laden des Bildes: ' + err);
        };
    });
}


function checkWithOCRSpace(imgData) {
    console.log("Check with OCR...");
    setBackgroundColor('orange');
    
    const startTime = performance.now(); // Startzeit

    const formData = new FormData();
    formData.append("base64Image", imgData);
    formData.append("language", "ger");
    formData.append('isOverlayRequired', true);
    formData.append('OCREngine', 2);
    formData.append('isTable', true);

    return fetch("https://api.ocr.space/parse/image", {
        method: "POST",
        headers: {
            "apikey": "K87108113888957"
        },
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        const endTime = performance.now(); // Endzeit
        const recognitionTime = (endTime - startTime).toFixed(2); // Zeitdifferenz in ms
        console.log(`OCR.Space Erkennung dauerte: ${recognitionTime} ms`);

        if (data && data.ParsedResults && data.ParsedResults.length > 0) {
            setBackgroundColor('green');
            evaluateSpaceData(data);
        } else {
            console.log("Fehler: Keine Ergebnisse von OCR.Space erhalten.");
        }
    })
    .catch(err => {
        console.error("Fehler bei der OCR.Space API: " + err);
    });
}

function evaluateSpaceData(data) {
    let productPrice = extractProductPrice(data);
    let productWeight = extractProductWeight(data);
    let productName = extractProductName(data, productWeight);
    let pricePerKilo = calculatePricePerKg(productPrice, productWeight);

    textOutput.innerHTML = '<b>' + productName + '</b><br>';
    textOutput.innerHTML += 'Weight: ' + productWeight + '<br>';
    textOutput.innerHTML += 'Price: ' + productPrice + '<br>';
    textOutput.innerHTML += 'Price per Kilo: ' + pricePerKilo;
}

function setBackgroundColor(color) {
    if (typeof color === 'string' && color.trim() !== '') {
        document.body.style.backgroundColor = color;
    } else {
        console.error('Bitte geben Sie eine gültige Farbe als Parameter ein.');
    }
}

// Foto alle 100ms aufnehmen
setInterval(takePhoto, 100);