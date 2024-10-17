let isProcessing = false;
let totalTime = 0;
let count = 0;

function takePhoto() {
    if (isProcessing) return;

    isProcessing = true;

    // Überprüfen, ob die Checkbox aktiviert ist
    const useHD = document.getElementById('resolutionSwitch').checked;
    const width = useHD ? 1280 : 1920;
    const height = useHD ? 720 : 1080;

    console.log("use hd?" + useHD);

     const photoSettings = {
                imageWidth: useHD ? 1280 : 1920,  // Wähle Auflösung basierend auf HD-Schalter
                imageHeight: useHD ? 720 : 1080,
                fillLightMode: 'auto', // Optional: Blitz-Modus, z.B. "auto"
                redEyeReduction: false // Optional: Rote-Augen-Reduktion
            };


    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: width }, height: { ideal: height } } })
        .then(stream => {
            const track = stream.getVideoTracks()[0];
            const imageCapture = new ImageCapture(track);
            imageCapture.takePhoto(photoSettings)
                .then(blob => {
                    // Löscht den vorherigen Output
                    textOutput.innerHTML = '';

                    const imgURL = URL.createObjectURL(blob);
                    photo.src = imgURL;
                    photo.style.width = '800px';

                    const img = new Image();
                    img.src = imgURL;
                    img.onload = () => {
                        console.log(`Foto-Auflösung: ${img.width}x${img.height}`);
                        textOutput.innerHTML += `Foto-Auflösung: ${img.width}x${img.height}<br>`;
                    };

                    const fileSizeKB = (blob.size / 1024).toFixed(2);
                    console.log(`Dateigröße: ${fileSizeKB} KB`);
                    textOutput.innerHTML += `Dateigröße: ${fileSizeKB} KB<br>`;

                    const reader = new FileReader();
                    reader.readAsDataURL(blob);
                    reader.onloadend = () => {
                        const base64data = reader.result;
                        processWithTesseract(base64data);
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
          //  textOutput.innerHTML += 'Erkannter Text: ' + text + '<br>';
        })
        .catch(err => {
            textOutput.innerHTML += 'Fehler bei der Texterkennung: ' + err + '<br>';
        })
        .finally(() => {
            isProcessing = false;
        });
}

// Foto alle 500ms
setInterval(takePhoto, 2500);
