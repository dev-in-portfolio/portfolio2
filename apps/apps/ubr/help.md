# UBR - User Guide

UBR (Ultimate Broker Routing) is a routing workstation for turning messy load documents into reviewed load objects and route decisions.

## Features
- Interactive mapping powered by Leaflet.
- Built-in document or image cropping tools.
- Optical Character Recognition (OCR) using Tesseract.js.
- Structured extraction review for scanned load details.
- Explicit ready, review, and exception queues for saved load objects.
- Route strategy comparison using reviewed load data, lane/deadhead estimates, and risk drivers.

## Step-by-Step Usage
1. Open the UBR application from the menu.
2. Use the map interface to view or manage routing locations.
3. Upload or capture a rate confirmation or other load document.
4. Use the cropping tool to isolate the relevant text on the document.
5. Initiate OCR, then choose **Extract Load** to turn the text into a structured review.
6. Correct any missing fields, review exceptions, and save the load object.
7. Use the queue on **Scan** to reopen any load in `review` or `exception` status until it reaches `ready`.
8. Return to **Today** to compare routing strategies using the best routable load, with tradeoffs for margin, distance, risk, and deadhead.

## Troubleshooting
- If the map fails to load, check your internet connection as map tiles are fetched dynamically.
- The OCR process (Tesseract.js) can be slow on older devices; please be patient.
- If image cropping doesn't work, ensure you are uploading a supported image format (JPEG, PNG).
- If a load lands in the `exception` queue, routing is intentionally blocked until the missing fields or location-resolution issues are cleared.
- If linehaul or deadhead metrics show as pending, save the load again after confirming pickup and delivery locations resolve cleanly.
