window.onload = function () {
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const output = document.getElementById('output');
    const context = canvas.getContext('2d');

    // Funktion zum Protokollieren von Nachrichten auf der HTML-Seite
    function logMessage(message) {
        output.innerText += message + '\n'; // Fügt die Nachricht zum Textinhalt des 'output'-Divs hinzu
    }

    // Funktion zum Starten des Webcam-Streams
    function startWebcam(facingMode) {
        navigator.mediaDevices.getUserMedia({
            video: { facingMode: facingMode }  // Kamera-Einstellung
        })
        .then(stream => {
            if ('srcObject' in video) {
                video.srcObject = stream; // Neuere Browser und iPhones
            } else {
                // Fallback für ältere Browser
                video.src = window.URL.createObjectURL(stream);
            }
            video.play();
            logMessage('Kamera gestartet: ' + facingMode);
        })
        .catch(error => {
            logMessage('Kamera mit "' + facingMode + '" konnte nicht gestartet werden: ' + error.message);
            // Rückfall auf die Frontkamera, falls die Rückkamera nicht verfügbar ist
            if (facingMode === "environment") {
                logMessage('Wechsel zur Frontkamera.');
                startWebcam("user");  // Frontkamera verwenden, wenn Rückkamera fehlschlägt
            }
        });
    }

    // Versuche, die Rückseitige Kamera zu starten
    startWebcam("environment");

    // Alle 2 Sekunden ein Bild von der Webcam erfassen und analysieren
    setInterval(() => {
        if (video.videoWidth && video.videoHeight) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            context.drawImage(video, 0, 0, canvas.width, canvas.height);

            const imgData = canvas.toDataURL('image/png');
            logMessage('Bild von der Webcam aufgenommen.');
            logMessage('Bildgröße: ' + canvas.width + 'x' + canvas.height + ' Pixel.');

            // Schritt 1: Prüfen mit Tesseract.js
            checkWithTesseract(imgData).then(isTextFound => {
                if (isTextFound) {
                    logMessage('Text erkannt, OCR.Space API wird verwendet.');
                    // Schritt 2: Falls Text gefunden wird, OCR.Space API verwenden
                    checkWithOCRSpace(imgData);
                } else {
                    logMessage('Kein Text erkannt.');
                }
            });
        }
    }, 2000);
};


// Tesseract.js verwendet, um zu prüfen, ob Text vorhanden ist
function checkWithTesseract(imgData) {
    return Tesseract.recognize(
        imgData,
        'deu', // Verwende die deutsche Sprachdatei
        { logger: (m) => console.log(m) }
    ).then(({ data: { text } }) => {
        if (text.match(/\w{7,}/)) {
            return true;  // Text gefunden
        } else {
            logMessage("Datenmüll");
            return false;  // Kein Text gefunden
        }
    });
}


// OCR.Space API-Aufruf für genaue Texterkennung
function checkWithOCRSpace(imgData) {
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
           evaluateSpaceData(data);
        })
        .catch(err => {
            logMessage("Error with OCR.Space API: " + err);
        });
}

function evaluateSpaceData(data) {
    const parsedText = data.ParsedResults[0].ParsedText;
    logMessage("OCR.Space Result: " + parsedText);
}


// Funktion zur Preisextraktion
function extractProductPrice(data) {
    let pricePattern = /(\d+[.,]\d{2})/;  // Muster für Preis im Format X.XX oder X,XX
    let priceCandidates = [];

    // Durchsuche die JSON-Daten nach Preiskandidaten und speichere deren Bounding Boxen
    data.ParsedResults[0].TextOverlay.Lines.forEach(line => {
        line.Words.forEach(word => {
            if (pricePattern.test(word.WordText)) {
                // Berechne die Größe der Bounding Box (Breite * Höhe)
                const boundingBoxSize = word.Width * word.Height;
                priceCandidates.push({
                    price: word.WordText,
                    size: boundingBoxSize
                });
            }
        });
    });

    // Falls keine Preiskandidaten gefunden wurden, gib eine entsprechende Meldung aus
    if (priceCandidates.length === 0) {
        return "Kein Preis gefunden";
    }

    // Wähle den Kandidaten mit der größten Bounding Box (der meiste Platz auf dem Preisschild)
    let largestPriceCandidate = priceCandidates.reduce((prev, curr) => {
        return (curr.size > prev.size) ? curr : prev;
    });

    return largestPriceCandidate.price + " €";
}

function extractProductWeight(data) {
    let weightPattern = /(\d+\s?-?\s?(g|kg|G|KG))/;  // Muster für Gewicht in Gramm oder Kilogramm
    let weightCandidates = [];

    // Durchsuche die JSON-Daten nach Gewichtskandidaten und speichere deren Bounding Boxen
    data.ParsedResults[0].TextOverlay.Lines.forEach(line => {
        line.Words.forEach(word => {
            if (weightPattern.test(word.WordText)) {
                // Berechne die Größe der Bounding Box (Breite * Höhe)
                const boundingBoxSize = word.Width * word.Height;
                weightCandidates.push({
                    weight: word.WordText,
                    size: boundingBoxSize
                });
            }
        });

        // Zusätzliche Überprüfung für kombinierte Gewichtszeilen wie "250 g 1 kg = 9.00"
        let combinedWeights = line.LineText.match(weightPattern);
        if (combinedWeights) {
            combinedWeights.forEach(matchedWeight => {
                const boundingBoxSize = line.Words.reduce((total, word) => total + word.Width * word.Height, 0);  // Größe der Bounding Box der gesamten Zeile
                weightCandidates.push({
                    weight: matchedWeight,
                    size: boundingBoxSize
                });
            });
        }
    });

    // Falls keine Gewichtsangaben gefunden wurden, gib eine entsprechende Meldung aus
    if (weightCandidates.length === 0) {
        return "Kein Gewicht gefunden";
    }

    // Priorisiere "g"-Angaben über "kg"
    let selectedWeight = weightCandidates.find(candidate => /g|G/.test(candidate.weight)) || weightCandidates[0];

    // Sonderfallbehandlung für Fehlerkennungen (z.B. "100 9" statt "100 g")
    if (selectedWeight.weight.includes('9') && !selectedWeight.weight.toLowerCase().includes('kg')) {
        selectedWeight.weight = selectedWeight.weight.replace('9', 'g');
    }

    return selectedWeight.weight;
}

function calculatePricePerKg(productPrice, productWeight) {
    // Überprüfen, ob der Produktpreis vorhanden und gültig ist
    if (!productPrice || isNaN(parseFloat(productPrice.replace(',', '.').replace('€', '').trim()))) {
        return "Ungültiger oder fehlender Produktpreis";
    }

    // Entferne mögliche Leerzeichen und konvertiere den Preis in einen numerischen Wert
    let price = parseFloat(productPrice.replace(',', '.').replace('€', '').trim());

    // Überprüfen, ob das Produktgewicht vorhanden und gültig ist
    if (!productWeight || (!productWeight.toLowerCase().includes('g') && !productWeight.toLowerCase().includes('kg'))) {
        return "Ungültiges oder fehlendes Produktgewicht";
    }

    // Konvertiere das Produktgewicht in Kilogramm, falls es in Gramm angegeben ist
    let weightInKg;
    if (productWeight.toLowerCase().includes('g')) {
        // Wenn das Gewicht in Gramm ist, entferne das 'g' und teile durch 1000, um in Kilogramm zu konvertieren
        weightInKg = parseFloat(productWeight.replace('g', '').trim()) / 1000;
    } else if (productWeight.toLowerCase().includes('kg')) {
        // Wenn das Gewicht in Kilogramm ist, entferne das 'kg' und nutze den Wert direkt
        weightInKg = parseFloat(productWeight.replace('kg', '').trim());
    }

    // Überprüfen, ob das Gewicht gültig ist
    if (isNaN(weightInKg) || weightInKg <= 0) {
        return "Ungültiges Produktgewicht";
    }

    // Berechne den Preis pro Kilogramm
    let pricePerKg = price / weightInKg;

    // Rückgabe des berechneten Preises pro Kilogramm in einem ansprechenden Format
    return ` ${pricePerKg.toFixed(2)} €`;
}

function extractProductName(data, productWeight) {
    let productName = "";
    let largestSize = 0;

    // Hilfsfunktion zur Berechnung des Anteils der Ziffern in einem Text
    function calculateDigitPercentage(text) {
        let digitCount = (text.match(/\d/g) || []).length;
        return (digitCount / text.length) * 100;
    }

    // Hilfsfunktion zum Entfernen des Produktgewichts aus dem Text
    function removeProductWeight(text, weight) {
        if (weight) {
            // Entferne das Produktgewicht (z.B. "250g" oder "250 g") aus dem Namen
            let weightPattern = new RegExp(weight.replace(/\s/g, '\\s?'), 'gi');
            text = text.replace(weightPattern, '').trim();
        }
        return text;
    }

    // Durchlaufe die JSON-Daten, um den längsten Text mit der größten Schriftgröße zu finden
    data.ParsedResults[0].TextOverlay.Lines.forEach(line => {
        let text = line.LineText;

        // Berechne die Breite und Höhe der Linie, um die Gesamtgröße der Bounding Box zu ermitteln
        let totalSize = line.MaxHeight * line.Words.reduce((totalWidth, word) => totalWidth + word.Width, 0);

        // Berechne den Anteil der Ziffern im Text
        let digitPercentage = calculateDigitPercentage(text);

        // Wähle nur Texte, die weniger als 40% Ziffern enthalten und kein "€"-Symbol
        if (digitPercentage < 40 && totalSize > largestSize && !text.includes('€')) {
            largestSize = totalSize;
            productName = text;  // Speichere den Text der Linie als Produktnamen
        }
    });

    // Entferne das Produktgewicht aus dem gefundenen Produktnamen
    productName = removeProductWeight(productName, productWeight);

    return productName ? productName : "Kein Produktname gefunden";
}








