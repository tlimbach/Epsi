import re
import easyocr

# EasyOCR-Leser für Deutsch initialisieren
reader = easyocr.Reader(['de'])

# Bilddatei laden und Texterkennung durchführen
result = reader.readtext('bilder/tomaten.jpeg')  # Pfad zum Bild

# 1. Alle erkannten Texte in der Reihenfolge, wie sie sich auf dem Preisschild befinden
print("1. Alle erkannten Texte in der Original-Reihenfolge:")
for detection in result:
    print(f"Erkannter Text: {detection[1]}")

# Liste der erkannten Texte mit ihren Bounding Box-Höhen speichern
texts_with_sizes = []
for detection in result:
    text = detection[1]  # Erkannter Text
    box = detection[0]  # Bounding Box (vier Punkte, x und y-Koordinaten)

    # Höhe der Bounding Box berechnen (Differenz zwischen y-Koordinaten)
    box_height = abs(box[0][1] - box[2][1])

    # Speichere den Text und die Höhe der Bounding Box in einer Liste
    texts_with_sizes.append((text, box_height))

# 2. Alle erkannten Texte in der Reihenfolge der Größe ihrer Bounding Box
texts_with_sizes.sort(key=lambda x: x[1], reverse=True)  # Sortiere nach Größe der Bounding Box
print("\n2. Alle erkannten Texte in der Reihenfolge der Größe ihrer Bounding Box:")
for text, size in texts_with_sizes:
    print(f"Erkannter Text: {text}, Bounding Box Höhe: {size}")

# 3. Vermutlich größter Preis in der Reihenfolge der Größe
largest_price = None
per_kg_price = None
weight = None
weight_text = None  # Speichert den gesamten Text, in dem das Gewicht gefunden wurde

# Prüfe alle erkannten Texte
for text, size in texts_with_sizes:
    # Preisüberprüfung (Zahlen mit Komma oder Punkt als Dezimaltrennzeichen)
    if re.search(r'\d+[.,]\d{2}', text) or '€' in text:
        # Überprüfe auf den Preis pro Kilogramm wie "12.60 € / Kg" oder "1 kg = 9.00"
        if re.search(r'\d+[.,]\d{2}\s?[€]?\s?/?.?\s?(kg|KG)', text, re.IGNORECASE) or re.search(
                r'1\s?kg\s?=\s?\d+[.,]\d{2}', text, re.IGNORECASE):
            per_kg_price = text
        elif not largest_price:  # Wenn es keinen Preis gibt, speichere den aktuellen
            largest_price = text

    # Allgemeine Gewichtserkennung (z.B. "350g", "330-g", "330 g") und Sonderfall "X 9"
    if re.search(r'\d+\s9', text):  # Prüfe auf eine Zahl gefolgt von "9" mit Leerzeichen dazwischen
        weight = re.sub(r'\s9', 'g', text)  # Ersetze "9" durch "g" für den Gewichtsausdruck
        weight_text = text
    else:
        weight_match = re.search(r'\d+\s?-?\s?(g|kg)', text, re.IGNORECASE)
        if weight_match and 'kg =' not in text.lower():
            weight = weight_match.group(0)  # Nur das Gewicht extrahieren
            weight_text = text  # Speichere den gesamten Text, in dem das Gewicht gefunden wurde

# 4. Falls kein Preis pro Kilo vorhanden ist, berechne ihn aus dem Gesamtpreis und dem Gewicht
calculated_per_kg_price = None
if largest_price and weight:
    try:
        weight_value = float(re.search(r'\d+', weight).group())
        if 'g' in weight.lower():
            weight_value /= 1000  # Konvertiere Gramm in Kilogramm
        # Entferne das Euro-Zeichen und konvertiere den Preis in Float
        price_value = float(largest_price.replace('€', '').replace(',', '.').strip())
        calculated_per_kg_price = f"1KG = {price_value / weight_value:.2f}"
    except Exception as e:
        print(f"Fehler bei der Berechnung des Preises pro Kilogramm: {e}")

# Ausgabe der Ergebnisse
print(f"\n3. Vermutlicher Preis: {largest_price}")
print(f"4. Erkannter Preis pro Kilogramm: {per_kg_price}")
print(f"5. Berechneter Preis pro Kilogramm: {calculated_per_kg_price}")
print(f"6. Erkanntes Gewicht: {weight} (Gefunden im Text: '{weight_text}')")
