let isStreamPaused = false; // Zustand des Streams (läuft oder pausiert)
let stream; // Variable für den Videostream
let randProzent = 20; // Prozentualer Wert für den Rand (oben und unten) – initial auf 25% gesetzt

// Starte den Videostream mit Zoomfaktor 2
function startVideoStream() {
    const videoElement = document.getElementById('video');
    const overlayCanvas = document.getElementById('overlayCanvas'); // Füge overlayCanvas hinzu

    const width = 1080; // Hochformat-Breite
    const height = 1920; // Hochformat-Höhe

    navigator.mediaDevices.getUserMedia({
        video: {
            facingMode: 'environment', // Kamera auf der Rückseite des Telefons
            width: { ideal: width },
            height: { ideal: height },
            advanced: [{ zoom: 2 }] // Setze den Zoomfaktor auf 2
        }
    })
    .then(localStream => {
        stream = localStream; // Speichere den Stream für späteres Stoppen
        videoElement.srcObject = stream; // Setze den Videostream auf das Videoelement
        videoElement.play(); // Spiele den Stream ab

        // Sobald das Video Metadaten geladen hat (wie Breite und Höhe), setze die Canvas-Größe und zeichne das Overlay
        videoElement.addEventListener('loadedmetadata', () => {
            overlayCanvas.width = videoElement.videoWidth;
            overlayCanvas.height = videoElement.videoHeight;
            drawOverlay(); // Rufe hier drawOverlay auf, um die grauen Bereiche zu zeichnen
        });
    })
    .catch(error => {
        console.error('Kamera konnte nicht gestartet werden:', error);
    });
}

// Funktion, um den Stream anzuhalten
function pauseVideoStream() {
    const videoElement = document.getElementById('video');
    videoElement.pause(); // Pausiere den Stream, aber das letzte Bild bleibt sichtbar
}

// Funktion, um den Stream fortzusetzen
function resumeVideoStream() {
    const videoElement = document.getElementById('video');
    videoElement.play(); // Setze den Stream fort
}

// Funktion, um den aktuellen Frame des Videos zu nehmen und zu beschneiden
function captureAndCropFrame() {
    const videoElement = document.getElementById('video');

    // Prüfe, ob das Video bereit ist
    if (!videoElement.videoWidth || !videoElement.videoHeight) {
        console.error("Das Video ist noch nicht bereit.");
        return null; // Wenn das Video noch nicht bereit ist, kehre zurück
    }

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    // Setze die Canvas-Größe auf das Video, aber nur auf den relevanten Teil (basierend auf randProzent)
    const videoWidth = videoElement.videoWidth;
    const videoHeight = videoElement.videoHeight;

    // Logge Breite und Höhe zur Fehlerbehebung
    console.log(`Video Breite: ${videoWidth}, Höhe: ${videoHeight}`);

    const cropWidth = videoWidth; // Nimm die volle Breite
    const cropHeight = videoHeight * (1 - (randProzent / 100) * 2); // Schneide oben und unten gemäß randProzent ab

    canvas.width = cropWidth;
    canvas.height = cropHeight;

    // Zeichne den mittleren Teil des Videos auf das Canvas
    const cropStartY = videoHeight * (randProzent / 100); // Beginne den Ausschnitt gemäß randProzent
    context.drawImage(videoElement, 0, cropStartY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);

    // Konvertiere das Canvas in Base64
    const base64Image = canvas.toDataURL('image/jpeg', 0.7); // 70% Qualität

    // Logge die Breite und Höhe des Canvas
    console.log(`OCR Canvas Breite: ${canvas.width}, Höhe: ${canvas.height}`);

    // Berechne die Größe der Base64-Daten in KB
    const sizeInBytes = (base64Image.length * (3 / 4)) - ((base64Image.match(/=/g) || []).length);
    const sizeInKB = (sizeInBytes / 1024).toFixed(2); // Größe in KB gerundet auf 2 Nachkommastellen
    console.log(`Bildgröße: ${sizeInKB} KB`);

    return base64Image;
}

// Funktion, die OCR.Space mit dem beschnittenen Frame aufruft
function handlePhotoCapture() {
    const button = document.getElementById('takePhotoBtn');

    if (!isStreamPaused) {
        // Stream ist aktiv, pausieren und OCR durchführen
        console.log('Der Fotoauslöser wurde gedrückt.');
        pauseVideoStream(); // Pausiere den Stream

        // Hol den aktuellen beschnittenen Frame als Base64
        const base64Image = captureAndCropFrame();

        // Prüfe, ob das Bild erfolgreich erfasst wurde
        if (base64Image) {
            // Sende das Base64-Bild an OCR.Space
            checkWithOCRSpace(base64Image);

            // Button-Text ändern
            button.textContent = "Stream fortsetzen";
            isStreamPaused = true;
        } else {
            console.error('Kein Bild konnte erfasst werden.');
        }
    } else {
        // Stream ist pausiert, zurücksetzen und den Stream wieder starten
        console.log('Stream wird fortgesetzt.');
        resumeVideoStream(); // Starte den Stream erneut

        // Button-Text zurücksetzen
        button.textContent = "Foto aufnehmen";

        // OCR-Ergebnis zurücksetzen
        // Schreibe die Ergebnisse in die jeweiligen Divs (in den Bereich mit der Klasse 'value')
        document.querySelector('#productName .value').innerHTML = "";
        document.querySelector('#productPrice .value').innerHTML = "";
        document.querySelector('#productWeight .value').innerHTML = "";
        document.querySelector('#productPreisKg .value').innerHTML = "";

        document.querySelectorAll('.output-box').forEach(box => {
            box.classList.remove('visible'); // Klasse entfernen, um Transparenz wiederherzustellen
        });

        isStreamPaused = false;
    }
}

// Funktion, um die nicht relevanten Bereiche auszublenden
function drawOverlay() {
    const overlayCanvas = document.getElementById('overlayCanvas');
    const context = overlayCanvas.getContext('2d');

    const videoHeight = overlayCanvas.height;
    const cropHeight = videoHeight * (randProzent / 100); // Beschneide oben und unten gemäß randProzent

    // Lösche das Canvas und setze die Transparenz
    context.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

    // Zeichne die ausgegrauten Bereiche oben und unten
    context.fillStyle = 'rgba(20, 20, 20, 0.5)'; // Leichtes und durchscheinendes Grau
    context.fillRect(0, 0, overlayCanvas.width, cropHeight); // Oben
    context.fillRect(0, videoHeight - cropHeight, overlayCanvas.width, cropHeight); // Unten
}

// Funktion für den Aufruf der OCR.Space API
function checkWithOCRSpace(base64Image) {
    console.log("Check with OCR...");
    setBackgroundColor(true); // Start des Erkennungsprozesses

    const startTime = performance.now(); // Startzeit

    const formData = new FormData();
    formData.append("base64Image", base64Image); // Sende das Base64-Image mit dem richtigen Präfix
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
            setBackgroundColor(false); // Erfolgreiche Erkennung
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

    // Verwende die Funktion extractPricePerKg, wenn calculatePricePerKg kein Ergebnis liefert
    if (pricePerKilo === "Ungültiger oder fehlender Produktpreis" || pricePerKilo === "Ungültiges oder fehlendes Produktgewicht") {
        pricePerKilo = extractPricePerKg(data);
    }

    // Schreibe die Ergebnisse in die jeweiligen Divs (in den Bereich mit der Klasse 'value')
    document.querySelector('#productName .value').innerHTML = productName;
    document.querySelector('#productPrice .value').innerHTML = productPrice;
    document.querySelector('#productWeight .value').innerHTML = productWeight;
    document.querySelector('#productPreisKg .value').innerHTML = pricePerKilo;

    // Mache die Ergebnis-DIVs sichtbar
    document.querySelectorAll('.output-box').forEach(box => {
        box.classList.add('visible');
    });
}

// Funktion, um den Hintergrund basierend auf der Erkennung zu ändern
function setBackgroundColor(detectionInProgress) {
    document.body.classList.remove('orange-bg', 'gray-bg'); // Entferne alle Klassen

    if (detectionInProgress) {
        document.body.classList.add('orange-bg'); // Färbe orange bei Erkennung
    } else {
        document.body.classList.add('gray-bg'); // Färbe grau nach Erkennung
    }
}

// Event Listener für den Fotoauslöser
document.getElementById('takePhotoBtn').addEventListener('click', handlePhotoCapture);

// Starte den Videostream direkt beim Laden der Seite
startVideoStream();