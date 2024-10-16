let zuletztDatenMuellerkannt = true;
let isProcessing = false;  // Statusvariable zur Überprüfung, ob eine Texterkennung läuft

window.onload = function () {
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const output = document.getElementById('output');
    const context = canvas.getContext('2d');

    // Funktion zum Starten des Webcam-Streams mit 1280x760 Auflösung
    function startWebcam(facingMode) {
        navigator.mediaDevices.getUserMedia({
            video: { facingMode: facingMode, width: { ideal: 1280 }, height: { ideal: 760 } }  // Kamera-Einstellung
        })
        .then(stream => {
            if ('srcObject' in video) {
                video.srcObject = stream; // Neuere Browser und iPhones
            } else {
                video.src = window.URL.createObjectURL(stream);  // Fallback für ältere Browser
            }
            video.play();
            console.log('Kamera gestartet: ' + facingMode);
        })
        .catch(error => {
            console.log('Kamera mit "' + facingMode + '" konnte nicht gestartet werden: ' + error.message);
            // Rückfall auf die Frontkamera, falls die Rückkamera nicht verfügbar ist
            if (facingMode === "environment") {
                console.log('Wechsel zur Frontkamera.');
                startWebcam("user");
            }
        });
    }

    // Versuche, die Rückseitige Kamera zu starten
    startWebcam("environment");

    // Alle 550 Millisekunden ein Bild von der Webcam erfassen und analysieren
    setInterval(() => {
        if (isProcessing) return;  // Verhindert, dass eine neue Erkennung gestartet wird, während eine läuft

        if (video.videoWidth && video.videoHeight) {
            // 20% oben und unten abschneiden
            const cropTop = 0.2 * video.videoHeight;
            const cropBottom = 0.2 * video.videoHeight;
            const croppedHeight = video.videoHeight - cropTop - cropBottom;

            canvas.width = video.videoWidth;
            canvas.height = croppedHeight;

            // Zeichne nur den mittleren Teil des Videos in das Canvas
            context.drawImage(video, 0, cropTop, video.videoWidth, croppedHeight, 0, 0, canvas.width, canvas.height);

            // Bild als JPEG mit 70% Qualität speichern
            const imgData = canvas.toDataURL('image/jpeg', 0.7);  // Bildqualität auf 70% setzen

            // Schritt 1: Prüfen mit Tesseract.js
            isProcessing = true;  // Setzt den Status auf "wird verarbeitet"
            checkWithTesseract(imgData).then(isTextFound => {
                if (isTextFound) {
                    console.log('Text erkannt.');

                    // Nur weiterleiten an OCR.Space, wenn zuvor Datenmüll erkannt wurde
                    if (zuletztDatenMuellerkannt) {
                        zuletztDatenMuellerkannt = false;
                        checkWithOCRSpace(imgData);
                    } else {
                        console.log("Aber immernoch gleiches Bild...");
                    }
                } else {
                    zuletztDatenMuellerkannt = true;
                    console.log('Kein Text erkannt.');
                }
                isProcessing = false;  // Setzt den Status zurück, wenn die Erkennung abgeschlossen ist
            });
        }
    }, 55);
};

// Tesseract.js verwendet, um zu prüfen, ob Text vorhanden ist
function checkWithTesseract(imgData) {
    return Tesseract.recognize(
        imgData,
        'deu'  // Verwende die deutsche Sprachdatei
    ).then(({ data: { text } }) => {
        if (text.match(/\w{7,}/)) {
            return true;  // Text gefunden
        } else {
            output.innerText = "Datenmüll";  // Ausgabe im Frontend
            return false;  // Kein Text gefunden
        }
    });
}

// OCR.Space API-Aufruf für genaue Texterkennung
function checkWithOCRSpace(imgData) {
    console.log("Check with OCR....");
    const formData = new FormData();
    formData.append("base64Image", imgData);
    formData.append("language", "ger");
    formData.append('isOverlayRequired', true);
    formData.append('OCREngine', 2);
    formData.append('isTable', true);

    fetch("https://api.ocr.space/parse/image", {
        method: "POST",
        headers: {
            "apikey": "K87108113888957"  // Füge hier deinen API-Schlüssel ein
        },
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        console.log("OCR.Space API Antwort:", data);
        if (data && data.ParsedResults && data.ParsedResults.length > 0) {
            evaluateSpaceData(data);
        } else {
            output.innerText = "Fehler: Keine Ergebnisse von OCR.Space erhalten.";
        }
    })
    .catch(err => {
        console.log("Fehler bei OCR.Space API: " + err);
    });
}

// Funktion zum Analysieren der OCR.Space API Antwort
function evaluateSpaceData(data) {
    const parsedText = data.ParsedResults[0].ParsedText;
    output.innerText = "OCR.Space Result: " + parsedText;
}