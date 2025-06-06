// Google Cloud Vision API configuration
const GOOGLE_API_KEY = 'AIzaSyAAVGD1a6hn8X_SAokeVRzGQSjtW-1s18A'; // Replace with your real API key
const GOOGLE_VISION_API_URL = 'https://vision.googleapis.com/v1/images:annotate';

document.addEventListener('DOMContentLoaded', function() {
    console.log('Script loaded successfully');
    
    const fileInput = document.getElementById('file-input');
    const fileNameDisplay = document.getElementById('file-name');
    const uploadForm = document.getElementById('upload-form');
    const loader = document.getElementById('loader');

    // Verify elements exist
    if (!fileInput || !uploadForm) {
        console.error('Required elements not found. Check your HTML structure.');
        return;
    }

    fileInput.addEventListener('change', function() {
        console.log('File selected:', this.files[0]?.name);
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
        console.log('Form submitted');
        
        if (fileInput.files.length === 0) {
            alert('Please select an image file first!');
            return;
        }

        const file = fileInput.files[0];
        console.log('Processing file:', file.name, 'Size:', file.size, 'Type:', file.type);
        
        // Validate file type
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/tiff'];
        if (!validTypes.includes(file.type)) {
            alert('Please select a valid image file (JPEG, PNG, GIF, BMP, or TIFF)');
            return;
        }

        if (file.size > 20 * 1024 * 1024) {
            alert('File size should be less than 20MB');
            return;
        }

        loader.style.display = 'block';

        try {
            // Clear any previous session data
            sessionStorage.clear();
            
            // Store image data for the result page
            console.log('Converting image to data URL...');
            const imageDataUrl = await convertToDataURL(file);
            sessionStorage.setItem('processedImage', imageDataUrl);
            sessionStorage.setItem('imageInfo', JSON.stringify({
                name: file.name,
                size: file.size,
                type: file.type,
                lastModified: file.lastModified
            }));
            console.log('Image data stored in sessionStorage');

            // Convert image to base64
            console.log('Converting to base64...');
            const base64Image = await convertToBase64(file);
            
            if (!base64Image || base64Image.length < 100) {
                throw new Error('Failed to convert image to base64 format');
            }
            console.log('Base64 conversion successful, length:', base64Image.length);

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

            console.log('Making API request...');
            const response = await fetch(`${GOOGLE_VISION_API_URL}?key=${GOOGLE_API_KEY}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            console.log('API Response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API Error:', errorText);
                throw new Error(`API request failed: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            console.log('API Response received:', data);
            
            if (data.responses && data.responses[0]) {
                const responseData = data.responses[0];
                
                if (responseData.error) {
                    console.error('API Error in response:', responseData.error);
                    sessionStorage.setItem('extractedText', `API Error: ${responseData.error.message}`);
                    sessionStorage.setItem('extractionStatus', 'error');
                } else if (responseData.textAnnotations && responseData.textAnnotations.length > 0) {
                    let extractedTextContent = responseData.textAnnotations[0].description;
                    extractedTextContent = cleanExtractedText(extractedTextContent);
                    
                    console.log('Text extracted successfully:', extractedTextContent.substring(0, 100) + '...');
                    
                    sessionStorage.setItem('extractedText', extractedTextContent);
                    sessionStorage.setItem('extractionStatus', 'success');
                } else {
                    console.log('No text detected');
                    sessionStorage.setItem('extractedText', 'No text detected in the image.\n\nTips:\n• Use clear, high-contrast images\n• Ensure text is readable\n• Check lighting conditions');
                    sessionStorage.setItem('extractionStatus', 'no-text');
                }
            } else {
                throw new Error('Invalid API response format');
            }
            
            // Verify data was stored
            const storedText = sessionStorage.getItem('extractedText');
            const storedStatus = sessionStorage.getItem('extractionStatus');
            console.log('Stored data - Text length:', storedText?.length, 'Status:', storedStatus);
            
            // Add a small delay before redirect to ensure data is stored
            setTimeout(() => {
                console.log('Redirecting to result.html...');
                window.location.href = 'result.html';
            }, 100);
            
        } catch (error) {
            console.error('Complete error:', error);
            
            // Store error information
            sessionStorage.setItem('extractedText', `Error: ${error.message}\n\nDebugging steps:\n• Check browser console for details\n• Verify API key is correct\n• Ensure internet connection\n• Try with a different image`);
            sessionStorage.setItem('extractionStatus', 'error');
            
            // Redirect to result page with error
            setTimeout(() => {
                window.location.href = 'result.html';
            }, 100);
        } finally {
            loader.style.display = 'none';
        }
    });
});

// Enhanced conversion functions with better error handling
function convertToDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            console.log('Data URL conversion successful');
            resolve(reader.result);
        };
        reader.onerror = (error) => {
            console.error('Data URL conversion failed:', error);
            reject(new Error('Failed to read file for preview'));
        };
        reader.readAsDataURL(file);
    });
}

function convertToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const result = reader.result;
                if (!result || typeof result !== 'string') {
                    reject(new Error('Invalid file read result'));
                    return;
                }
                
                const base64String = result.split(',')[1];
                if (!base64String || base64String.length === 0) {
                    reject(new Error('Failed to extract base64 data'));
                    return;
                }
                
                console.log('Base64 conversion successful');
                resolve(base64String);
            } catch (error) {
                console.error('Base64 conversion error:', error);
                reject(new Error('Error processing file: ' + error.message));
            }
        };
        reader.onerror = (error) => {
            console.error('File read error:', error);
            reject(new Error('Failed to read file'));
        };
        reader.readAsDataURL(file);
    });
}

function cleanExtractedText(text) {
    if (!text) return '';
    
    text = text.replace(/\r\n/g, '\n');
    text = text.replace(/\r/g, '\n');
    text = text.replace(/\n{3,}/g, '\n\n');
    text = text.replace(/[ \t]{2,}/g, ' ');
    text = text.trim();
    
    return text;
}

// Drag and drop functions
function handleDragOver(evt) {
    evt.preventDefault();
    evt.stopPropagation();
    const uploadArea = document.querySelector('.upload-area');
    uploadArea?.classList.add('dragover');
}

function handleDragLeave(evt) {
    evt.preventDefault();
    evt.stopPropagation();
    const uploadArea = document.querySelector('.upload-area');
    uploadArea?.classList.remove('dragover');
}

function handleDrop(evt) {
    evt.preventDefault();
    evt.stopPropagation();
    const uploadArea = document.querySelector('.upload-area');
    uploadArea?.classList.remove('dragover');

    const dt = evt.dataTransfer;
    const files = dt.files;

    if (files.length > 0) {
        const file = files[0];
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/tiff'];
        
        if (!validTypes.includes(file.type)) {
            alert('Please select a valid image file');
            return;
        }
        
        if (file.size > 20 * 1024 * 1024) {
            alert('File size should be less than 20MB');
            return;
        }
    }

    const fileInput = document.querySelector('#file-input');
    if (fileInput) {
        fileInput.files = files;
        
        if (files.length > 0) {
            const fileName = files[0].name;
            const fileNameElement = document.querySelector('#file-name');
            if (fileNameElement) {
                fileNameElement.textContent = 'Selected: ' + fileName;
                fileNameElement.style.display = 'block';
            }
            previewImage(files[0]);
        }
    }
}

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
            const uploadArea = document.querySelector('.upload-area');
            if (uploadArea) {
                uploadArea.appendChild(preview);
            }
        }
        preview.src = e.target.result;
        preview.style.display = 'block';
    };
    reader.readAsDataURL(file);
}
