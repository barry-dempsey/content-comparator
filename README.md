# Content Comparator

A Node.js/Express tool to compare JSON localization content between languages and identify missing keys. Perfect for managing multi-language content in applications.

## Features

- **Single Language Comparison**: Compare two JSON language files to find missing keys
- **Batch Comparison**: Compare one source language with multiple target languages at once
- **Multiple Output Formats**: Export results as JSON, CSV, or detailed reports
- **File Uploads**: Upload JSON files directly or paste JSON content
- **Real-time Analysis**: Instant missing key identification with completion percentage
- **Responsive Web UI**: Modern, dark-mode friendly interface

## Installation

```bash
# Install dependencies
npm install

# Start the server
npm start

# For development with auto-reload
npm run dev
```

The server will run on `http://localhost:3000`

## Usage

### Web Interface

1. Open `http://localhost:3000` in your browser
2. Choose either **Single Compare** or **Batch Compare**
3. Paste or upload JSON content
4. Click Compare to analyze
5. Export results in your preferred format

### API Endpoints

#### Single Comparison

**POST** `/api/compare`

Compare two JSON objects via request body.

Request:
```json
{
  "sourceJSON": "{\"key1\": \"value1\"}",
  "targetJSON": "{\"key1\": \"value1\"}",
  "targetLanguageName": "Spanish",
  "format": "json"
}
```

Response:
```json
{
  "totalKeys": 5,
  "translatedKeys": 3,
  "missingKeys": ["key4", "key5"],
  "missingKeysCount": 2,
  "completionPercent": 60,
  "allKeysPresent": false
}
```

**Query Parameters:**
- `format`: `json` (default), `csv`, or `report`

---

#### Compare Files

**POST** `/api/compare-files`

Compare two JSON files via file upload.

Form Data:
- `sourceFile`: JSON file (source language)
- `targetFile`: JSON file (target language)
- `targetLanguageName`: Language name (optional)
- `format`: Output format - `json`, `csv`, or `report` (default: `json`)

---

#### Batch Comparison

**POST** `/api/batch-compare`

Compare one source language with multiple target languages.

Request:
```json
{
  "sourceJSON": "{\"key1\": \"value1\", \"key2\": \"value2\"}",
  "targetLanguages": {
    "Spanish": "{\"key1\": \"valor1\"}",
    "French": "{\"key1\": \"valeur1\", \"key2\": \"valeur2\"}",
    "German": "{\"key1\": \"wert1\", \"key2\": \"wert2\"}"
  },
  "format": "json"
}
```

Response:
```json
{
  "Spanish": {
    "totalKeys": 2,
    "translatedKeys": 1,
    "missingKeys": ["key2"],
    "missingKeysCount": 1,
    "completionPercent": 50,
    "allKeysPresent": false
  },
  "French": {
    "totalKeys": 2,
    "translatedKeys": 2,
    "missingKeys": [],
    "missingKeysCount": 0,
    "completionPercent": 100,
    "allKeysPresent": true
  },
  "German": {
    "totalKeys": 2,
    "translatedKeys": 2,
    "missingKeys": [],
    "missingKeysCount": 0,
    "completionPercent": 100,
    "allKeysPresent": true
  }
}
```

---

#### Batch Compare Files

**POST** `/api/batch-compare-files`

Compare one source file with multiple target language files.

Form Data:
- `sourceFile`: JSON file (source language)
- `targetFiles`: Multiple JSON files (target languages)
- `format`: Output format - `json` or `report` (default: `json`)

---

## JSON Format

Your JSON files should follow this structure:

```json
{
  "hotel_home_cta": "Book Now",
  "hotel_home_title": "Welcome to Hotels",
  "hotel_home_subtitle": "Find your perfect stay",
  "hotel_search_placeholder": "Where are you going?"
}
```

Keys should be unique identifiers (like `hotel_home_cta`), and values should be the text content for each touchpoint.

## Output Formats

### JSON Format
Structured data with statistics and missing keys list.

### CSV Format
Tabular format showing each key, source value, and translation status:
```
Key,Source Value,Status
"hotel_home_cta","Book Now","Translated"
"hotel_home_title","Welcome","Missing"
```

### Report Format
Human-readable text report with summary and detailed analysis:
```
LOCALIZATION COMPARISON REPORT
Generated: 2024-01-15T10:30:00Z
Target Language: Spanish
============================================================

SUMMARY:
Total Keys: 10
Translated Keys: 8
Missing Keys: 2
Completion: 80%

MISSING KEYS:
============================================================
1. hotel_search_placeholder
2. hotel_payment_method
```

## Project Structure

```
content-comparator/
├── server.js                 # Express server setup
├── package.json              # Dependencies
├── routes/
│   └── compare.js           # API route handlers
├── controllers/
│   └── comparisonController.js  # Business logic
├── utils/
│   └── comparator.js        # Comparison utilities
├── public/
│   └── index.html           # Web UI
└── README.md                # This file
```

## Examples

### Example 1: Single Language Comparison

Source (English):
```json
{
  "welcome": "Welcome",
  "signin": "Sign In",
  "signup": "Sign Up"
}
```

Target (Spanish):
```json
{
  "welcome": "Bienvenido",
  "signin": "Iniciar Sesión"
}
```

Result:
- Missing Keys: `["signup"]`
- Completion: 66%

### Example 2: Batch Comparison

Source (English) + 3 Language Targets = Comparison Report showing which languages need which translations.

## Error Handling

All endpoints return appropriate HTTP status codes:
- `200`: Success
- `400`: Bad request (invalid JSON, missing fields)
- `500`: Server error

Error responses include an `error` field with a descriptive message.

## Performance

- Handles JSON objects of any size
- Batch comparison with 10+ languages processes instantly
- Suitable for production use with optimization

## License

MIT
