document.addEventListener('DOMContentLoaded', function() {
    console.log('Result page loaded');
    
    // Check if sessionStorage is available
    if (typeof(Storage) === "undefined") {
        console.error('SessionStorage not supported');
        document.body.innerHTML = '<div style="text-align: center; margin-top: 50px;"><h2>Browser not supported</h2><p>Please use a modern browser that supports sessionStorage.</p></div>';
        return;
    }
    
    // Get all stored data
    const extractedText = sessionStorage.getItem('extractedText');
    const extractionStatus = sessionStorage.getItem('extractionStatus');
    const processedImageData = sessionStorage.getItem('processedImage');
    const imageInfoStr = sessionStorage.getItem('imageInfo');
    
    console.log('Retrieved data:');
    console.log('- Text length:', extractedText?.length || 0);
    console.log('- Status:', extractionStatus);
    console.log('- Has image data:', !!processedImageData);
    console.log('- Image info:', imageInfoStr);
    
    // Get DOM elements
    const extractedTextElement = document.getElementById('extracted-text');
    const statusMessageElement = document.getElementById('status-message');
    const processedImageElement = document.getElementById('processed-image');
    const imageInfoElement = document.getElementById('image-info');
    
    // Verify elements exist
    if (!extractedTextElement) {
        console.error('extracted-text element not found');
        return;
    }
    
    // Check if we have data
    if (!extractedText) {
        console.error('No extracted text found in sessionStorage');
        extractedTextElement.textContent = 'No text data found. Please go back and upload an image.';
        if (statusMessageElement) {
            statusMessageElement.innerHTML = '<div class="error-message">No extraction data found. Please upload an image first.</div>';
        }
        return;
    }

    // Display the extracted text
    extractedTextElement.textContent = extractedText;
    console.log('Text displayed successfully');

    // Display status message
    if (statusMessageElement) {
        if (extractionStatus === 'success') {
            statusMessageElement.innerHTML = '<div class="success-message"><i class="fas fa-check-circle"></i> Text extraction completed successfully!</div>';
        } else if (extractionStatus === 'error') {
            statusMessageElement.innerHTML = '<div class="error-message"><i class="fas fa-exclamation-triangle"></i> There was an issue with text extraction. See details below.</div>';
        } else if (extractionStatus === 'no-text') {
            statusMessageElement.innerHTML = '<div class="error-message"><i class="fas fa-info-circle"></i> No text was detected in the image.</div>';
        }
    }

    // Display image preview
    if (processedImageData && processedImageElement) {
        processedImageElement.src = processedImageData;
        processedImageElement.style.display = 'block';
        console.log('Image preview displayed');
        
        // Display image info
        if (imageInfoStr && imageInfoElement) {
            try {
                const imageInfo = JSON.parse(imageInfoStr);
                const sizeInKB = Math.round(imageInfo.size / 1024);
                imageInfoElement.textContent = `${imageInfo.name} (${sizeInKB} KB)`;
            } catch (e) {
                console.error('Error parsing image info:', e);
            }
        }
    }

    // Calculate and display statistics
    updateStatistics(extractedText);

    // Set up event listeners
    setupEventListeners(extractedText);
});

function updateStatistics(text) {
    const charCount = text.length;
    const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
    const lineCount = text.split('\n').length;

    const charCountElement = document.getElementById('char-count');
    const wordCountElement = document.getElementById('word-count');
    const lineCountElement = document.getElementById('line-count');

    if (charCountElement) charCountElement.textContent = charCount.toLocaleString();
    if (wordCountElement) wordCountElement.textContent = wordCount.toLocaleString();
    if (lineCountElement) lineCountElement.textContent = lineCount.toLocaleString();
}

function setupEventListeners(extractedText) {
    const copyBtn = document.getElementById('copy-btn');
    const downloadBtn = document.getElementById('download-btn');
    const editBtn = document.getElementById('edit-btn');

    if (copyBtn) {
        copyBtn.addEventListener('click', function() {
            copyTextToClipboard(extractedText, this);
        });
    }

    if (downloadBtn) {
        downloadBtn.addEventListener('click', function() {
            downloadTextAsFile(extractedText);
        });
    }

    if (editBtn) {
        editBtn.addEventListener('click', function() {
            openEditModal(extractedText);
        });
    }
}

function copyTextToClipboard(text, button) {
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(() => {
            showButtonFeedback(button, '<i class="fas fa-check"></i> Copied!', 2000);
        }).catch(() => {
            fallbackCopyTextToClipboard(text, button);
        });
    } else {
        fallbackCopyTextToClipboard(text, button);
    }
}

function fallbackCopyTextToClipboard(text, button) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.top = "0";
    textArea.style.left = "0";
    
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        document.execCommand('copy');
        showButtonFeedback(button, '<i class="fas fa-check"></i> Copied!', 2000);
    } catch (err) {
        console.error('Copy failed:', err);
        showButtonFeedback(button, '<i class="fas fa-times"></i> Copy Failed', 2000);
    }
    
    document.body.removeChild(textArea);
}

function showButtonFeedback(button, message, duration) {
    const originalHTML = button.innerHTML;
    button.innerHTML = message;
    setTimeout(() => {
        button.innerHTML = originalHTML;
    }, duration);
}

function downloadTextAsFile(text) {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    a.style.display = 'none';
    a.href = url;
    a.download = 'extracted-text.txt';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}

function openEditModal(text) {
    const modal = document.getElementById('edit-modal');
    const textarea = document.getElementById('edit-textarea');
    
    if (modal && textarea) {
        textarea.value = text;
        modal.style.display = 'block';
        
        const saveBtn = document.getElementById('save-edit-btn');
        const cancelBtn = document.getElementById('cancel-edit-btn');
        
        if (saveBtn) {
            saveBtn.onclick = function() {
                const editedText = textarea.value;
                const extractedTextElement = document.getElementById('extracted-text');
                if (extractedTextElement) {
                    extractedTextElement.textContent = editedText;
                    updateStatistics(editedText);
                    sessionStorage.setItem('extractedText', editedText);
                }
                modal.style.display = 'none';
            };
        }
        
        if (cancelBtn) {
            cancelBtn.onclick = function() {
                modal.style.display = 'none';
            };
        }
    }
}
