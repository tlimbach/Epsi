let isStreamPaused = false; // Zustand des Streams (läuft oder pausiert)
let stream; // Variable für den Videostream

// Starte den Videostream
function startVideoStream() {
    const videoElement = document.getElementById('video');
    
    const width = 1920; // FullHD (Originalauflösung)
    const height = 1080; // FullHD (Originalauflösung)

    navigator.mediaDevices.getUserMedia({
        video: { 
            facingMode: 'environment', 
            width: { ideal: width }, 
            height: { ideal: height } 
        }
    })
    .then(localStream => {
        stream = localStream; // Speichere den Stream für späteres Stoppen
        videoElement.srcObject = stream; // Setze den Videostream auf das Videoelement
        videoElement.play(); // Spiele den Stream ab
    })
    .catch(error => {
        console.error('Kamera konnte nicht gestartet werden:', error);
    });
}

// Funktion, um den Videostream anzuhalten (pausieren, aber Bild beibehalten)
function pauseVideoStream() {
    const videoElement = document.getElementById('video');
    videoElement.pause(); // Pausiere den Stream, aber das letzte Bild bleibt sichtbar
}

// Funktion, um den Videostream fortzusetzen
function resumeVideoStream() {
    const videoElement = document.getElementById('video');
    videoElement.play(); // Spiele den Stream wieder ab
}

// Funktion, um den aktuellen Frame des Videos zu nehmen
function captureFrameFromVideo() {
    const videoElement = document.getElementById('video');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    // Setze die Canvas-Größe auf die des Videos
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;

    // Zeichne den aktuellen Frame des Videos auf das Canvas
    context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

    // Konvertiere das Canvas in Base64
    const base64Image = canvas.toDataURL('image/jpeg', 0.7); // 70% Qualität

    return base64Image;
}

// Funktion, die OCR.Space mit dem aktuellen Frame aufruft
function handlePhotoCapture() {
    const button = document.getElementById('takePhotoBtn');
    
    if (!isStreamPaused) {
        // Stream ist aktiv, pausieren und OCR durchführen
        console.log('Der Fotoauslöser wurde gedrückt.');
        pauseVideoStream(); // Pausiere den Stream
        
        // Hol den aktuellen Frame als Base64
        const base64Image = captureFrameFromVideo();

        // Sende das Base64-Bild an OCR.Space
        checkWithOCRSpace(base64Image);

        // Button-Text ändern
        button.textContent = "Stream fortsetzen";
        isStreamPaused = true;
    } else {
        // Stream ist pausiert, zurücksetzen und den Stream wieder starten
        console.log('Stream wird fortgesetzt.');
        resumeVideoStream(); // Starte den Stream erneut

        // Button-Text zurücksetzen
        button.textContent = "Foto aufnehmen";

        // OCR-Ergebnis zurücksetzen
        document.getElementById('textOutput').innerHTML = "Erkannter Text wird hier angezeigt...";
        isStreamPaused = false;
    }
}

// Funktion für den Aufruf der OCR.Space API
function checkWithOCRSpace(base64Image) {
    console.log("Check with OCR...");
    setBackgroundColor('orange');
    
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

    const textOutput = document.getElementById('textOutput');
    textOutput.innerHTML = `<b>${productName}</b><br>
                            Weight: ${productWeight}<br>
                            Price: ${productPrice}<br>
                            Price per Kilo: ${pricePerKilo}`;
}

function setBackgroundColor(color) {
    if (typeof color === 'string' && color.trim() !== '') {
        document.body.style.backgroundColor = color;
    } else {
        console.error('Bitte geben Sie eine gültige Farbe als Parameter ein.');
    }
}

// Event Listener für den Fotoauslöser
document.getElementById('takePhotoBtn').addEventListener('click', handlePhotoCapture);

// Starte den Videostream direkt beim Laden der Seite
startVideoStream();