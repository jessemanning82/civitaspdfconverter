# CIVITAS PDF Form Converter

A web application that converts PDF forms into interactive web forms using AI analysis.

## Features

- PDF file upload and display
- AI-powered form field detection and analysis
- Dynamic web form generation
- Support for various form field types:
  - Text inputs
  - Checkboxes
  - Radio buttons
  - Date inputs
  - Dropdown menus
- Field validation and formatting
- Grouped field organization
- Real-time form analysis with loading indicator

## Prerequisites

- Node.js (v12 or higher)
- NPM (Node Package Manager)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/jessemanning82/civitaspdfconverter.git
cd civitaspdfconverter
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
node server.js
```

4. Open your browser and navigate to `http://localhost:4000`

## Usage

1. Upload a PDF form using the upload button or drag-and-drop
2. Wait for the AI analysis to complete
3. The interactive web form will appear on the right side
4. Fill out the form fields as needed

## Dependencies

- express
- multer
- openai
- pdf-parse
- canvas
- and others (see package.json)

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

[MIT](https://choosealicense.com/licenses/mit/)