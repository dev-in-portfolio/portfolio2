# UBR - Developer Documentation

UBR (Ultimate Broker Routing) is a complex, feature-rich web application that integrates several powerful frontend libraries to simulate a logistics and broker routing dashboard.

## Architecture & Tech Stack
- HTML5, CSS3, Vanilla JavaScript.
- Tailwind CSS for responsive layout and styling.
- Leaflet.js for interactive maps.
- Cropper.js for image manipulation.
- Tesseract.js for Optical Character Recognition (OCR).

## Key Systems / Components
- Mapping Module: Initializes and manages Leaflet maps, markers, and routing layers.
- Image Processing: Integrates Cropper.js to allow users to format images before data extraction.
- Data Extraction (OCR): Uses Tesseract.js to run client-side text recognition on cropped image data.
- UI/Dashboard: A Tailwind-powered layout managing the complex state of various panels.

## Performance & Accessibility / Development Notes
- Tesseract.js downloads language models asynchronously; ensure loading states are clearly communicated to the user.
- Map instances should be properly destroyed or managed when navigating away to prevent memory leaks.
- Cropper.js interactions need careful tuning for touch devices.

## Integration & DB
- Operates primarily client-side for portfolio demonstration.
- Leaflet relies on external tile servers (e.g., OpenStreetMap).
- Tesseract.js relies on external language data blobs.
- Backend database integration would be required for a production environment to save routes and extracted data.