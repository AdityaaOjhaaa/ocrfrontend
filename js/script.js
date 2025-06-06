// Google Cloud Vision API configuration
const GOOGLE_API_KEY = 'AIzaSyAAVGD1a6hn8X_SAokeVRzGQSjtW-1s18A'; // Replace with your actual API key
const GOOGLE_VISION_API_URL = 'https://vision.googleapis.com/v1/images:annotate';

document.addEventListener('DOMContentLoaded', function() {
    const fileInput = document.getElementById('file-input');
    const fileNameDisplay = document.getElementById('file-name');
    const uploadForm = document.getElementById('upload-form');
    const loader = document.getElementById('loader');

    fileInput.addEventListener('change', function() {
        if (this.files.length > 0) {
            fileNameDisplay.textContent = 'Selected: ' + this.files[0].name;
            fileNameDisplay.style.display = 'block';
            previewImage(this.files[0]);
        } else {
            fileNameDisplay.style.display = 'none';
        }
    });

    uploadForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        if (fileInput.files.length === 0) {
            alert('Please select an image file first!');
            return;
        }

        const file = fileInput.files[0];
        
        // Validate file type
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/tiff'];
        if (!validTypes.includes(file.type)) {
            alert('Please select a valid image file (JPEG, PNG, GIF, BMP, or TIFF)');
            return;
        }

        loader.style.display = 'block';

        try {
            // Store image data for the result page
            const imageDataUrl = await convertToDataURL(file);
            sessionStorage.setItem('processedImage', imageDataUrl);
            sessionStorage.setItem('imageInfo', JSON.stringify({
                name: file.name,
                size: file.size,
                type: file.type,
                lastModified: file.lastModified
            }));

            // Convert image to base64
            const base64Image = await convertToBase64(file);
            
            // Prepare request for Google Vision API
            const requestBody = {
                requests: [
                    {
                        image: {
                            content: base64Image
                        },
                        features: [
                            {
                                type: 'TEXT_DETECTION',
                                maxResults: 1
                            }
                        ],
                        imageContext: {
                            languageHints: ['en']
                        }
                    }
                ]
            };

            const response = await fetch(`${GOOGLE_VISION_API_URL}?key=${GOOGLE_API_KEY}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            const data = await response.json();
            
            if (data.responses && data.responses[0] && data.responses[0].textAnnotations) {
                let extractedTextContent = data.responses[0].textAnnotations[0].description;
                extractedTextContent = cleanExtractedText(extractedTextContent);
                
                // Store the result in sessionStorage
                sessionStorage.setItem('extractedText', extractedTextContent);
                sessionStorage.setItem('extractionStatus', 'success');
                
                console.log('Text extraction successful');
            } else if (data.responses && data.responses[0] && data.responses[0].error) {
                const errorMessage = data.responses[0].error.message || 'Unknown error occurred';
                const errorText = `Error: ${errorMessage}\n\nTips for better results:\n• Ensure good lighting\n• Use high contrast images\n• Keep text horizontal\n• Avoid shadows and glare`;
                
                sessionStorage.setItem('extractedText', errorText);
                sessionStorage.setItem('extractionStatus', 'error');
            } else {
                const noTextMessage = 'No text detected in the image.\n\nTips for better results:\n• Ensure the image contains clear, readable text\n• Check image quality and resolution\n• Make sure text is not too small or blurry';
                
                sessionStorage.setItem('extractedText', noTextMessage);
                sessionStorage.setItem('extractionStatus', 'no-text');
            }
            
            // Redirect to result page
            window.location.href = 'result.html';
            
        } catch (error) {
            console.error('Vision API Error:', error);
            const errorText = `Error: Failed to process image. ${error.message}\n\nPlease check:\n• Your internet connection\n• API key validity\n• Image file format`;
            
            sessionStorage.setItem('extractedText', errorText);
            sessionStorage.setItem('extractionStatus', 'error');
            
            // Redirect to result page even on error
            window.location.href = 'result.html';
        } finally {
            loader.style.display = 'none';
        }
    });
});

// Convert file to data URL for preview
function convertToDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Convert file to base64 format required by Google Vision API
function convertToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const base64String = reader.result.split(',')[1];
            resolve(base64String);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Function to clean and improve extracted text
function cleanExtractedText(text) {
    if (!text) return '';
    
    text = text.replace(/\r\n/g, '\n');
    text = text.replace(/\r/g, '\n');
    text = text.replace(/\n{3,}/g, '\n\n');
    text = text.replace(/[ \t]{2,}/g, ' ');
    text = text.trim();
    
    return text;
}

// Enhanced drag and drop functionality
function handleDragOver(evt) {
    evt.preventDefault();
    evt.stopPropagation();
    const uploadArea = document.querySelector('.upload-area');
    uploadArea.classList.add('dragover');
}

function handleDragLeave(evt) {
    evt.preventDefault();
    evt.stopPropagation();
    const uploadArea = document.querySelector('.upload-area');
    uploadArea.classList.remove('dragover');
}

function handleDrop(evt) {
    evt.preventDefault();
    evt.stopPropagation();
    const uploadArea = document.querySelector('.upload-area');
    uploadArea.classList.remove('dragover');

    const dt = evt.dataTransfer;
    const files = dt.files;

    if (files.length > 0) {
        const file = files[0];
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/tiff'];
        
        if (!validTypes.includes(file.type)) {
            alert('Please select a valid image file (JPEG, PNG, GIF, BMP, or TIFF)');
            return;
        }
        
        if (file.size > 20 * 1024 * 1024) {
            alert('File size should be less than 20MB');
            return;
        }
    }

    document.querySelector('#file-input').files = files;

    if (files.length > 0) {
        const fileName = files[0].name;
        document.querySelector('#file-name').textContent = 'Selected: ' + fileName;
        document.querySelector('#file-name').style.display = 'block';
        previewImage(files[0]);
    }
}

// Add image preview functionality
function previewImage(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        let preview = document.getElementById('image-preview');
        if (!preview) {
            preview = document.createElement('img');
            preview.id = 'image-preview';
            preview.style.maxWidth = '300px';
            preview.style.maxHeight = '200px';
            preview.style.marginTop = '10px';
            preview.style.border = '1px solid #ddd';
            preview.style.borderRadius = '4px';
            document.querySelector('.upload-area').appendChild(preview);
        }
        preview.src = e.target.result;
        preview.style.display = 'block';
    };
    reader.readAsDataURL(file);
}
