const express = require('express');
const path = require('path');
const OpenAI = require('openai');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const { createCanvas } = require('canvas');
const fs = require('fs').promises;
const os = require('os');

// Configure multer with file size limit (20MB)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 20 * 1024 * 1024 // 20MB limit
    }
});

const app = express();

// Configure OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Middleware
app.use(express.json({limit: '50mb'}));
app.use(express.static(__dirname));

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Global error handler:', err);
    res.status(500).json({
        error: 'Internal server error',
        details: err.message
    });
});

// Serve index.html as the default file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Function to convert PDF text to image
async function convertPDFToImage(pdfBuffer) {
    try {
        // Parse PDF
        const data = await pdfParse(pdfBuffer);
        
        // Create a canvas
        const canvas = createCanvas(1024, 1024);
        const ctx = canvas.getContext('2d');
        
        // Set white background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, 1024, 1024);
        
        // Set text properties
        ctx.fillStyle = 'black';
        ctx.font = '12px Arial';
        
        // Draw text content
        const lines = data.text.split('\n');
        let y = 20;
        for (const line of lines) {
            ctx.fillText(line, 20, y);
            y += 20;
            if (y > 1000) break; // Stop if we reach the bottom
        }
        
        // Convert to PNG
        const pngBuffer = canvas.toBuffer('image/png');
        
        console.log('PDF converted to image successfully');
        return pngBuffer.toString('base64');
    } catch (error) {
        console.error('Error converting PDF to image:', error);
        throw error;
    }
}

// Function to optimize PNG
async function optimizePNG(base64Image) {
    try {
        // Convert base64 to buffer
        const imageBuffer = Buffer.from(base64Image, 'base64');
        
        // Optimize image
        const optimizedBuffer = await sharp(imageBuffer)
            .resize(1024, 1024, { fit: 'inside' })
            .png({ quality: 80 })
            .toBuffer();
        
        console.log('Original image size:', imageBuffer.length / 1024, 'KB');
        console.log('Optimized image size:', optimizedBuffer.length / 1024, 'KB');
        
        return optimizedBuffer.toString('base64');
    } catch (error) {
        console.error('Error optimizing PNG:', error);
        throw error;
    }
}

// Endpoint to analyze PDF using Chat API with Vision
app.post('/analyze-pdf', upload.single('pdf'), async (req, res) => {
    try {
        console.log('Received upload request');
        
        if (!req.file) {
            console.error('No file received');
            return res.status(400).json({ error: 'No PDF file provided' });
        }

        console.log('File details:', {
            originalName: req.file.originalname,
            size: req.file.size / 1024 / 1024 + ' MB',
            mimetype: req.file.mimetype
        });

        // Validate file type
        if (req.file.mimetype !== 'application/pdf') {
            console.error('Invalid file type:', req.file.mimetype);
            return res.status(400).json({ error: 'Only PDF files are allowed.' });
        }

        console.log('Converting PDF to image...');
        const imageBase64 = await convertPDFToImage(req.file.buffer);

        console.log('Sending to OpenAI Vision API...');

        const response = await openai.chat.completions.create({
            model: "gpt-4-turbo-2024-04-09",
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: "Analyze this form and identify all form fields. For each field, provide:\n1) field type (text input, checkbox, radio button, dropdown, date, etc.)\n2) label text\n3) whether it's required\n4) any group it belongs to (if fields are logically grouped)\n5) any specific format or pattern (e.g., phone numbers, SSN, EIN)\n6) any placeholder text or default value\n7) any validation rules (min/max length, number ranges, etc.)\n\nReturn the analysis as a JSON object with this structure:\n{\n  \"formName\": \"[Form Title or Type]\",\n  \"fields\": [\n    {\n      \"id\": \"unique_id\",\n      \"type\": \"field_type\",\n      \"label\": \"label_text\",\n      \"required\": boolean,\n      \"group\": \"group_name_if_applicable\",\n      \"format\": \"format_if_applicable\",\n      \"placeholder\": \"placeholder_if_applicable\",\n      \"validation\": {\n        \"pattern\": \"regex_pattern_if_applicable\",\n        \"min\": \"min_value_if_applicable\",\n        \"max\": \"max_value_if_applicable\"\n      }\n    }\n  ]\n}"
                        },
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:image/png;base64,${imageBase64}`
                            }
                        }
                    ]
                }
            ],
            max_tokens: 4096
        });

        console.log('Analysis successful');
        console.log('Raw response:', response.choices[0].message.content);
        
        // Validate and clean the JSON response
        let analysisContent;
        try {
            // First, try to parse the content directly
            analysisContent = JSON.parse(response.choices[0].message.content);
        } catch (parseError) {
            console.error('Initial JSON parse failed:', parseError);
            try {
                // If direct parsing fails, try to clean the string first
                let cleanedContent = response.choices[0].message.content;
                
                // Remove markdown code blocks and any extra text
                cleanedContent = cleanedContent.replace(/^[\s\S]*?```(?:json)?/, ''); // Remove everything before the first ```
                cleanedContent = cleanedContent.replace(/```[\s\S]*$/, ''); // Remove everything after the last ```
                cleanedContent = cleanedContent.trim();
                
                // Remove any trailing commas before closing braces/brackets
                cleanedContent = cleanedContent.replace(/,(\s*[}\]])/g, '$1');
                
                console.log('Cleaned content:', cleanedContent);
                
                analysisContent = JSON.parse(cleanedContent);
            } catch (secondaryParseError) {
                console.error('Secondary JSON parse failed:', secondaryParseError);
                console.error('Cleaned content that failed to parse:', cleanedContent);
                throw new Error('Failed to parse form analysis response');
            }
        }

        res.json({ analysis: JSON.stringify(analysisContent) });

    } catch (error) {
        console.error('Error analyzing PDF:', error);
        res.status(500).json({ 
            error: 'Failed to analyze PDF', 
            details: error.message 
        });
    }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
}); 