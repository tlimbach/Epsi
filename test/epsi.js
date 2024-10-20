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
    .then(stream => {
        videoElement.srcObject = stream; // Setze den Videostream auf das Videoelement
    })
    .catch(error => {
        console.error('Kamera konnte nicht gestartet werden:', error);
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
        console.log(data);

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
    console.log('Der Fotoauslöser wurde gedrückt.');

    // Hol den aktuellen Frame als Base64
    const base64Image = captureFrameFromVideo();

    // Rufe die OCR.Space-Funktion auf
    checkWithOCRSpace(base64Image);
}

// Event Listener für den Fotoauslöser (für spätere Implementierung)
document.getElementById('takePhotoBtn').addEventListener('click', () => {
    console.log('Der Fotoauslöser wurde gedrückt.');
    handlePhotoCapture();
    // Die Fotoaufnahme und OCR.Space Logik kommt später hier rein.
});

startVideoStream();