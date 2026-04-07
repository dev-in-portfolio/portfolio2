# UBR - Developer Documentation

UBR (Ultimate Broker Routing) is a browser-based routing workstation for turning OCR intake into reviewed load objects and route decisions.

## Architecture & Tech Stack
- HTML5, CSS3, Vanilla JavaScript.
- Tailwind CSS for responsive layout and styling.
- Leaflet.js for interactive maps.
- Cropper.js for image manipulation.
- Tesseract.js for Optical Character Recognition (OCR).
- Local storage for saved load objects and correction history.

## Key Systems / Components
- Mapping Module: Initializes and manages Leaflet maps, markers, and routing layers.
- Image Processing: Integrates Cropper.js to allow users to format images before data extraction.
- Data Extraction (OCR): Uses Tesseract.js to run client-side text recognition on cropped image data.
- Structured Load Review: Converts OCR text into a normalized load object with confidence, queue bucket, validation state, and review reasons.
- Queue Management: Splits reviewed loads into ready, review, and exception queues with reopen-for-fix behavior.
- Strategy Comparison: Uses reviewed load data plus geocoded pickup/delivery estimates to compare margin, distance, deadhead, and risk tradeoffs.
- UI/Dashboard: A Tailwind-powered layout managing the complex state of various panels.

## Performance & Accessibility / Development Notes
- Tesseract.js downloads language models asynchronously; ensure loading states are clearly communicated to the user.
- Map instances should be properly destroyed or managed when navigating away to prevent memory leaks.
- Cropper.js interactions need careful tuning for touch devices.
- Structured extraction is heuristic right now; manual review remains part of the intended workflow, and exception-queue behavior is intentional rather than a failure state.

## Integration & DB
- Operates primarily client-side for portfolio demonstration.
- Leaflet relies on external tile servers (e.g., OpenStreetMap).
- Tesseract.js relies on external language data blobs.
- Backend database integration would be required for a production environment to save routes, reviewed load objects, and audit history.
