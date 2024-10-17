let isProcessing = false;
let totalTime = 0;
let count = 0;

function takePhoto() {
    if (isProcessing) return; // Verhindert, dass ein neuer Prozess gestartet wird, bevor der alte abgeschlossen ist.

    isProcessing = true;  // Setzt den Zustand auf "in Bearbeitung"

    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } } })
        .then(stream => {
            const track = stream.getVideoTracks()[0];
            const imageCapture = new ImageCapture(track);
            imageCapture.takePhoto()
                .then(blob => {
                    // Löscht den vorherigen Output
                    textOutput.innerHTML = '';

                    const imgURL = URL.createObjectURL(blob);
                    photo.src = imgURL;
                    photo.style.width = '800px'; // Setzt die Breite des Bildes auf 800px

                    // Zeige die Auflösung des Fotos an
                    const img = new Image();
                    img.src = imgURL;
                    img.onload = () => {
                        console.log(`Foto-Auflösung: ${img.width}x${img.height}`);
                        textOutput.innerHTML += `Foto-Auflösung: ${img.width}x${img.height}<br>`;
                    };

                    // Berechne die Dateigröße des Fotos
                    const fileSizeKB = (blob.size / 1024).toFixed(2);
                    console.log(`Dateigröße: ${fileSizeKB} KB`);
                    textOutput.innerHTML += `Dateigröße: ${fileSizeKB} KB<br>`;

                    // Wandelt das Bild-Blob in eine Base64-Daten-URL um
                    const reader = new FileReader();
                    reader.readAsDataURL(blob);
                    reader.onloadend = () => {
                        const base64data = reader.result;
                        processWithTesseract(base64data);
                    };

                    // Stop stream to free resources
                    stream.getTracks().forEach(track => track.stop());
                })
                .catch(error => {
                    console.error('Fotoaufnahme fehlgeschlagen:', error);
                    isProcessing = false;  // Setzt den Zustand zurück
                });
        })
        .catch(error => {
            console.error('Kamera konnte nicht gestartet werden:', error);
            isProcessing = false;  // Setzt den Zustand zurück
        });
}

function processWithTesseract(imageData) {
    const startTime = performance.now(); // Startzeit messen

    Tesseract.recognize(
        imageData,
        'deu',  // Verwende die deutsche Sprachdatei
        { logger: m => console.log(m) }
    ).then(({ data: { text } }) => {
        count++;
        const endTime = performance.now();
        const recognitionTime = (endTime - startTime).toFixed(2); // Zeit in Millisekunden
        totalTime += parseFloat(recognitionTime);

        const avgTime = (totalTime / count).toFixed(2); // Durchschnittszeit
        textOutput.innerHTML += `Durchschnittliche Erkennungszeit: ${avgTime} ms<br>`;
        textOutput.innerHTML += 'Erkannter Text: ' + text + '<br>';
    }).catch(err => {
        textOutput.innerHTML += 'Fehler bei der Texterkennung: ' + err + '<br>';
    }).finally(() => {
        isProcessing = false;  // Setzt den Zustand zurück, um den nächsten Prozess zu starten
    });
}

// Foto alle 500ms, aber nur, wenn der aktuelle Prozess abgeschlossen ist
setInterval(takePhoto, 500);
