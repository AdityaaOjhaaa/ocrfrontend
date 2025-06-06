// Google Cloud Vision API configuration
const GOOGLE_API_KEY = 'AIzaSyAAVGD1a6hn8X_SAokeVRzGQSjtW-1s18A'; // Replace with your actual API key
const GOOGLE_VISION_API_URL = 'https://vision.googleapis.com/v1/images:annotate';

document.addEventListener('DOMContentLoaded', function() {
    const fileInput = document.getElementById('file-input');
    const fileNameDisplay = document.getElementById('file-name');
    const uploadForm = document.getElementById('upload-form');
    const loader = document.getElementById('loader');
    const resultContainer = document.getElementById('result-container');
    const extractedText = document.getElementById('extracted-text');
    const copyBtn = document.getElementById('copy-btn');
    const tryAgainBtn = document.getElementById('try-again-btn');

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
        resultContainer.style.display = 'none';

        try {
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
                            languageHints: ['en'] // You can add more languages as needed
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
                
                // Clean and format the extracted text
                extractedTextContent = cleanExtractedText(extractedTextContent);
                
                extractedText.textContent = extractedTextContent;
                resultContainer.style.display = 'block';
                
                console.log('Text extraction successful');
            } else if (data.responses && data.responses[0] && data.responses[0].error) {
                // Handle API errors
                const errorMessage = data.responses[0].error.message || 'Unknown error occurred';
                extractedText.textContent = `Error: ${errorMessage}\n\nTips for better results:\n• Ensure good lighting\n• Use high contrast images\n• Keep text horizontal\n• Avoid shadows and glare`;
                resultContainer.style.display = 'block';
            } else {
                // No text detected
                extractedText.textContent = 'No text detected in the image.\n\nTips for better results:\n• Ensure the image contains clear, readable text\n• Check image quality and resolution\n• Make sure text is not too small or blurry';
                resultContainer.style.display = 'block';
            }
        } catch (error) {
            console.error('Vision API Error:', error);
            extractedText.textContent = `Error: Failed to process image. ${error.message}\n\nPlease check:\n• Your internet connection\n• API key validity\n• Image file format`;
            resultContainer.style.display = 'block';
        } finally {
            loader.style.display = 'none';
        }
    });

    // Enhanced copy functionality
    copyBtn.addEventListener('click', function() {
        const textToCopy = extractedText.textContent;
        
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(textToCopy).then(() => {
                this.innerHTML = '<i class="fas fa-check"></i> Copied!';
                setTimeout(() => {
                    this.innerHTML = '<i class="fas fa-copy"></i> Copy Text';
                }, 2000);
            }).catch(() => {
                fallbackCopyTextToClipboard(textToCopy, this);
            });
        } else {
            fallbackCopyTextToClipboard(textToCopy, this);
        }
    });

    tryAgainBtn.addEventListener('click', function() {
        fileInput.value = '';
        fileNameDisplay.style.display = 'none';
        resultContainer.style.display = 'none';
        
        // Remove image preview if exists
        const preview = document.getElementById('image-preview');
        if (preview) {
            preview.style.display = 'none';
        }
    });
});

// Convert file to base64 format required by Google Vision API
function convertToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            // Remove the data URL prefix to get just the base64 string
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
    
    // Normalize line breaks and remove excessive whitespace
    text = text.replace(/\r\n/g, '\n');
    text = text.replace(/\r/g, '\n');
    text = text.replace(/\n{3,}/g, '\n\n');
    text = text.replace(/[ \t]{2,}/g, ' ');
    
    // Trim whitespace from beginning and end
    text = text.trim();
    
    return text;
}

// Fallback copy function for older browsers
function fallbackCopyTextToClipboard(text, button) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        document.execCommand('copy');
        button.innerHTML = '<i class="fas fa-check"></i> Copied!';
        setTimeout(() => {
            button.innerHTML = '<i class="fas fa-copy"></i> Copy Text';
        }, 2000);
    } catch (err) {
        console.error('Fallback: Could not copy text', err);
        button.innerHTML = '<i class="fas fa-times"></i> Copy Failed';
        setTimeout(() => {
            button.innerHTML = '<i class="fas fa-copy"></i> Copy Text';
        }, 2000);
    }
    
    document.body.removeChild(textArea);
}

// Enhanced drag and drop functionality
function handleDragOver(evt) {
    evt.preventDefault();
    evt.stopPropagation();
    const uploadArea = document.querySelector('.upload-area');
    uploadArea.classList.add('dragover');
    
    // Visual feedback for file type
    const files = evt.dataTransfer.files;
    if (files.length > 0) {
        const file = files[0];
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/tiff'];
        if (!validTypes.includes(file.type)) {
            uploadArea.classList.add('invalid-file');
        } else {
            uploadArea.classList.remove('invalid-file');
        }
    }
}

function handleDragLeave(evt) {
    evt.preventDefault();
    evt.stopPropagation();
    const uploadArea = document.querySelector('.upload-area');
    uploadArea.classList.remove('dragover', 'invalid-file');
}

function handleDrop(evt) {
    evt.preventDefault();
    evt.stopPropagation();
    const uploadArea = document.querySelector('.upload-area');
    uploadArea.classList.remove('dragover', 'invalid-file');

    const dt = evt.dataTransfer;
    const files = dt.files;

    // Validate file type and size
    if (files.length > 0) {
        const file = files[0];
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/tiff'];
        
        if (!validTypes.includes(file.type)) {
            alert('Please select a valid image file (JPEG, PNG, GIF, BMP, or TIFF)');
            return;
        }
        
        // Google Vision API has a 20MB limit for base64 encoded images
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
        // Create or update image preview
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
