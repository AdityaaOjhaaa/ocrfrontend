// OCR.space API configuration
const OCR_API_KEY = 'K83871909388957'; // Your OCR.space API key
const OCR_API_URL = 'https://api.ocr.space/parse/image';

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

        // Enhanced FormData for handwritten and stylized text
        const formData = new FormData();
        formData.append('file', fileInput.files[0]);
        formData.append('apikey', OCR_API_KEY);
        formData.append('language', 'auto'); // Auto-detect language for better recognition
        formData.append('OCREngine', '2'); // Engine 2 is better for handwriting and stylized text
        formData.append('scale', 'true'); // Improve recognition for low-resolution images
        formData.append('isTable', 'false'); // Disable table detection for better text flow
        formData.append('detectOrientation', 'true'); // Auto-correct image orientation
        formData.append('isOverlayRequired', 'false');
        
        // Additional parameters for better handwriting recognition
        formData.append('filetype', 'auto'); // Auto-detect file type
        formData.append('isCreateSearchablePdf', 'false');
        formData.append('isSearchablePdfHideTextLayer', 'false');

        loader.style.display = 'block';
        resultContainer.style.display = 'none';

        try {
            const response = await fetch(OCR_API_URL, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            
            if (data.IsErroredOnProcessing === false && data.ParsedResults && data.ParsedResults.length > 0) {
                let parsedText = data.ParsedResults[0].ParsedText;
                
                // Post-processing for better handwritten text output
                parsedText = cleanHandwrittenText(parsedText);
                
                extractedText.textContent = parsedText;
                resultContainer.style.display = 'block';
                
                // Display confidence level if available
                if (data.ParsedResults[0].TextOverlay && data.ParsedResults[0].TextOverlay.HasOverlay) {
                    console.log('OCR Confidence available - check console for details');
                }
            } else {
                // Enhanced error handling
                let errorMessage = 'Failed to process image';
                if (data.ErrorMessage) {
                    errorMessage = data.ErrorMessage;
                } else if (data.ErrorDetails) {
                    errorMessage = data.ErrorDetails;
                }
                
                extractedText.textContent = 'Error: ' + errorMessage + '\n\nTips for better results:\n• Ensure good lighting\n• Use high contrast\n• Keep text horizontal\n• Avoid shadows and glare';
                resultContainer.style.display = 'block';
            }
        } catch (error) {
            console.error('OCR Error:', error);
            extractedText.textContent = 'Error: Failed to connect to OCR service. Please check your internet connection and try again.\n\nFor handwritten text, ensure:\n• Clear, legible writing\n• Good image quality\n• Proper lighting';
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
    });
});

// Function to clean and improve handwritten text recognition results
function cleanHandwrittenText(text) {
    if (!text) return '';
    
    // Remove excessive whitespace and normalize line breaks
    text = text.replace(/\r\n/g, '\n');
    text = text.replace(/\r/g, '\n');
    text = text.replace(/\n{3,}/g, '\n\n');
    text = text.replace(/[ \t]{2,}/g, ' ');
    
    // Fix common OCR errors in handwritten text
    text = text.replace(/\b0\b/g, 'O'); // Zero to O in words
    text = text.replace(/\b1\b(?=[a-zA-Z])/g, 'I'); // 1 to I before letters
    text = text.replace(/(?<=[a-zA-Z])\b1\b/g, 'l'); // 1 to l after letters
    text = text.replace(/\b5\b(?=[a-zA-Z])/g, 'S'); // 5 to S in words
    
    // Remove artifacts and clean up
    text = text.replace(/[^\w\s\.,!?;:'"()-]/g, '');
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

    // Validate file type
    if (files.length > 0) {
        const file = files[0];
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/tiff'];
        
        if (!validTypes.includes(file.type)) {
            alert('Please select a valid image file (JPEG, PNG, GIF, BMP, or TIFF)');
            return;
        }
        
        // Check file size (max 1MB for free OCR.space)
        if (file.size > 1024 * 1024) {
            alert('File size should be less than 1MB for optimal results');
            return;
        }
    }

    document.querySelector('#file-input').files = files;

    if (files.length > 0) {
        const fileName = files[0].name;
        document.querySelector('#file-name').textContent = 'Selected: ' + fileName;
        document.querySelector('#file-name').style.display = 'block';
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

// Enhanced file input change handler with preview
document.addEventListener('DOMContentLoaded', function() {
    const fileInput = document.getElementById('file-input');
    if (fileInput) {
        fileInput.addEventListener('change', function() {
            if (this.files.length > 0) {
                previewImage(this.files[0]);
            }
        });
    }
});
