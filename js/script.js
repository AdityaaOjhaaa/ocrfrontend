// Replace this with your actual Render backend URL after deployment
const API_BASE_URL = 'https://ocrbackend-8mdz.onrender.com';

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

        const formData = new FormData();
        formData.append('file', fileInput.files[0]);

        loader.style.display = 'block';
        resultContainer.style.display = 'none';

        try {
            const response = await fetch(`${API_BASE_URL}/upload`, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            
            if (response.ok) {
                extractedText.textContent = data.text;
                resultContainer.style.display = 'block';
            } else {
                extractedText.textContent = 'Error: ' + (data.error || 'Failed to process image');
                resultContainer.style.display = 'block';
            }
        } catch (error) {
            extractedText.textContent = 'Error: Failed to connect to server. Please try again.';
            resultContainer.style.display = 'block';
        } finally {
            loader.style.display = 'none';
        }
    });

    copyBtn.addEventListener('click', function() {
        const textToCopy = extractedText.textContent;
        navigator.clipboard.writeText(textToCopy).then(() => {
            this.innerHTML = '<i class="fas fa-check"></i> Copied!';
            setTimeout(() => {
                this.innerHTML = '<i class="fas fa-copy"></i> Copy Text';
            }, 2000);
        });
    });

    tryAgainBtn.addEventListener('click', function() {
        fileInput.value = '';
        fileNameDisplay.style.display = 'none';
        resultContainer.style.display = 'none';
    });
});

// Drag and drop functionality
function handleDragOver(evt) {
    evt.preventDefault();
    evt.stopPropagation();
    document.querySelector('.upload-area').classList.add('dragover');
}

function handleDragLeave(evt) {
    evt.preventDefault();
    evt.stopPropagation();
    document.querySelector('.upload-area').classList.remove('dragover');
}

function handleDrop(evt) {
    evt.preventDefault();
    evt.stopPropagation();
    document.querySelector('.upload-area').classList.remove('dragover');

    const dt = evt.dataTransfer;
    const files = dt.files;

    document.querySelector('#file-input').files = files;

    if (files.length > 0) {
        document.querySelector('#file-name').textContent = 'Selected: ' + files[0].name;
        document.querySelector('#file-name').style.display = 'block';
    }
}
