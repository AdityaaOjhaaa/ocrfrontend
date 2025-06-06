document.addEventListener('DOMContentLoaded', function() {
    // Get elements
    const extractedTextElement = document.getElementById('extracted-text');
    const copyBtn = document.getElementById('copy-btn');
    const downloadBtn = document.getElementById('download-btn');
    const editBtn = document.getElementById('edit-btn');
    const charCountElement = document.getElementById('char-count');
    const wordCountElement = document.getElementById('word-count');
    const lineCountElement = document.getElementById('line-count');
    const statusMessageElement = document.getElementById('status-message');
    const processedImageElement = document.getElementById('processed-image');
    const imageInfoElement = document.getElementById('image-info');
    
    // Modal elements
    const editModal = document.getElementById('edit-modal');
    const editTextarea = document.getElementById('edit-textarea');
    const saveEditBtn = document.getElementById('save-edit-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');

    // Get data from sessionStorage[1][4]
    const extractedText = sessionStorage.getItem('extractedText');
    const extractionStatus = sessionStorage.getItem('extractionStatus');
    const processedImageData = sessionStorage.getItem('processedImage');
    const imageInfo = JSON.parse(sessionStorage.getItem('imageInfo') || '{}');

    // Check if we have data
    if (!extractedText) {
        extractedTextElement.textContent = 'No text data found. Please go back and upload an image.';
        statusMessageElement.innerHTML = '<div class="error-message">No extraction data found. Please upload an image first.</div>';
        return;
    }

    // Display the extracted text
    extractedTextElement.textContent = extractedText;

    // Display status message
    if (extractionStatus === 'success') {
        statusMessageElement.innerHTML = '<div class="success-message"><i class="fas fa-check-circle"></i> Text extraction completed successfully!</div>';
    } else if (extractionStatus === 'error') {
        statusMessageElement.innerHTML = '<div class="error-message"><i class="fas fa-exclamation-triangle"></i> There was an issue with text extraction. See details below.</div>';
    } else if (extractionStatus === 'no-text') {
        statusMessageElement.innerHTML = '<div class="error-message"><i class="fas fa-info-circle"></i> No text was detected in the image. Try with a clearer image.</div>';
    }

    // Display image preview
    if (processedImageData) {
        processedImageElement.src = processedImageData;
        processedImageElement.style.display = 'block';
        
        // Display image info
        if (imageInfo.name) {
            const sizeInKB = Math.round(imageInfo.size / 1024);
            imageInfoElement.textContent = `${imageInfo.name} (${sizeInKB} KB)`;
        }
    }

    // Calculate and display statistics
    updateStatistics(extractedText);

    // Copy functionality
    copyBtn.addEventListener('click', function() {
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(extractedText).then(() => {
                showButtonFeedback(this, '<i class="fas fa-check"></i> Copied!', 2000);
            }).catch(() => {
                fallbackCopyTextToClipboard(extractedText, this);
            });
        } else {
            fallbackCopyTextToClipboard(extractedText, this);
        }
    });

    // Download functionality
    downloadBtn.addEventListener('click', function() {
        downloadTextAsFile(extractedText, imageInfo.name || 'extracted-text');
    });

    // Edit functionality
    editBtn.addEventListener('click', function() {
        editTextarea.value = extractedTextElement.textContent;
        editModal.style.display = 'block';
    });

    // Save edit
    saveEditBtn.addEventListener('click', function() {
        const editedText = editTextarea.value;
        extractedTextElement.textContent = editedText;
        updateStatistics(editedText);
        editModal.style.display = 'none';
        
        // Update sessionStorage with edited text
        sessionStorage.setItem('extractedText', editedText);
    });

    // Cancel edit
    cancelEditBtn.addEventListener('click', function() {
        editModal.style.display = 'none';
    });

    // Close modal when clicking outside
    editModal.addEventListener('click', function(e) {
        if (e.target === editModal) {
            editModal.style.display = 'none';
        }
    });
});

// Update statistics
function updateStatistics(text) {
    const charCount = text.length;
    const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
    const lineCount = text.split('\n').length;

    document.getElementById('char-count').textContent = charCount.toLocaleString();
    document.getElementById('word-count').textContent = wordCount.toLocaleString();
    document.getElementById('line-count').textContent = lineCount.toLocaleString();
}

// Show button feedback
function showButtonFeedback(button, message, duration) {
    const originalHTML = button.innerHTML;
    button.innerHTML = message;
    setTimeout(() => {
        button.innerHTML = originalHTML;
    }, duration);
}

// Fallback copy function
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
        showButtonFeedback(button, '<i class="fas fa-check"></i> Copied!', 2000);
    } catch (err) {
        console.error('Fallback: Could not copy text', err);
        showButtonFeedback(button, '<i class="fas fa-times"></i> Copy Failed', 2000);
    }
    
    document.body.removeChild(textArea);
}

// Download text as file
function downloadTextAsFile(text, originalFileName) {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    // Create filename
    const baseName = originalFileName ? originalFileName.replace(/\.[^/.]+$/, "") : "extracted-text";
    const fileName = `${baseName}-extracted.txt`;
    
    a.style.display = 'none';
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}
