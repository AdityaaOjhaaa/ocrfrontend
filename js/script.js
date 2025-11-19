// Google Cloud Vision API configuration
const GOOGLE_API_KEY = 'AIzaSyAySYZ8iGk7Mmjpnh1gnE0jKz_nyhQAQac'; // Make sure this is your real key
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
        
        // Enhanced file validation
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/tiff'];
        if (!validTypes.includes(file.type)) {
            alert('Please select a valid image file (JPEG, PNG, GIF, BMP, or TIFF)');
            return;
        }

        // Check file size (Google Vision API limit)
        if (file.size > 20 * 1024 * 1024) {
            alert('File size should be less than 20MB');
            return;
        }

        // Check if file is too small (might indicate corruption)
        if (file.size < 1024) {
            alert('Image file seems too small. Please select a valid image.');
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
            
            // Validate base64 conversion
            if (!base64Image || base64Image.length < 100) {
                throw new Error('Failed to convert image to base64 format');
            }

            console.log('Image converted to base64, size:', base64Image.length);

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
                            languageHints: ['en', 'hi'] // Add more languages as needed
                        }
                    }
                ]
            };

            console.log('Making API request to Google Vision...');

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
                console.error('API Error Response:', errorText);
                
                if (response.status === 400) {
                    throw new Error('Invalid request. Check your API key and image format.');
                } else if (response.status === 403) {
                    throw new Error('API key invalid or billing not enabled. Please check your Google Cloud setup.');
                } else if (response.status === 429) {
                    throw new Error('API quota exceeded. Please try again later.');
                } else {
                    throw new Error(`API request failed with status ${response.status}`);
                }
            }

            const data = await response.json();
            console.log('API Response data:', data);
            
            if (data.responses && data.responses[0]) {
                const response_data = data.responses[0];
                
                // Check for API errors in response
                if (response_data.error) {
                    console.error('API returned error:', response_data.error);
                    const errorMessage = response_data.error.message || 'Unknown API error occurred';
                    sessionStorage.setItem('extractedText', `API Error: ${errorMessage}\n\nPossible solutions:\n• Check your API key configuration\n• Ensure billing is enabled\n• Verify image format and quality`);
                    sessionStorage.setItem('extractionStatus', 'error');
                } else if (response_data.textAnnotations && response_data.textAnnotations.length > 0) {
                    // Success - text found
                    let extractedTextContent = response_data.textAnnotations[0].description;
                    extractedTextContent = cleanExtractedText(extractedTextContent);
                    
                    console.log('Text extracted successfully, length:', extractedTextContent.length);
                    
                    sessionStorage.setItem('extractedText', extractedTextContent);
                    sessionStorage.setItem('extractionStatus', 'success');
                } else {
                    // No text detected
                    console.log('No text detected in image');
                    const noTextMessage = 'No text detected in the image.\n\nTips for better results:\n• Ensure the image contains clear, readable text\n• Check image quality and resolution\n• Make sure text is not too small or blurry\n• Ensure good lighting and contrast\n• Try with a different image format';
                    
                    sessionStorage.setItem('extractedText', noTextMessage);
                    sessionStorage.setItem('extractionStatus', 'no-text');
                }
            } else {
                throw new Error('Invalid response format from API');
            }
            
            // Redirect to result page
            window.location.href = 'result.html';
            
        } catch (error) {
            console.error('Complete error details:', error);
            
            let errorMessage = 'Failed to process image. ';
            
            if (error.message.includes('Failed to fetch')) {
                errorMessage += 'Network error - check your internet connection.';
            } else if (error.message.includes('API key')) {
                errorMessage += 'API key issue - please verify your Google Cloud setup.';
            } else if (error.message.includes('CORS')) {
                errorMessage += 'CORS error - you may need to use a backend server.';
            } else {
                errorMessage += error.message;
            }
            
            errorMessage += '\n\nDebugging info:\n• Check browser console for detailed errors\n• Verify API key is correctly set\n• Ensure Google Cloud billing is enabled\n• Try with a different image';
            
            sessionStorage.setItem('extractedText', errorMessage);
            sessionStorage.setItem('extractionStatus', 'error');
            
            // Redirect to result page even on error
            window.location.href = 'result.html';
        } finally {
            loader.style.display = 'none';
        }
    });
});

// Enhanced base64 conversion with error handling
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
                
                resolve(base64String);
            } catch (error) {
                reject(new Error('Error processing file: ' + error.message));
            }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
    });
}

// Convert file to data URL for preview
function convertToDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Failed to read file for preview'));
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

// Rest of your existing functions...
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
