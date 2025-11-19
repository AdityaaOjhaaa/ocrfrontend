// Google Cloud configuration
const GOOGLE_API_KEY = 'AIzaSyAySYZ8iGk7Mmjpnh1gnE0jKz_nyhQAQac'; // Your key
const GOOGLE_VISION_API_URL = 'https://vision.googleapis.com/v1/images:annotate';

document.addEventListener('DOMContentLoaded', () => {
  const fileInput = document.getElementById('file-input');
  const fileNameDisplay = document.getElementById('file-name');
  const imagePreview = document.getElementById('image-preview');
  const uploadForm = document.getElementById('upload-form');
  const loader = document.getElementById('loader');
  const submitBtn = document.getElementById('submit-btn');
  const ocrLanguageSelect = document.getElementById('ocr-language');

  // File selection
  fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
      const file = fileInput.files[0];
      fileNameDisplay.textContent = 'Selected: ' + file.name;
      fileNameDisplay.style.display = 'block';
      previewImage(file, imagePreview);
    } else {
      fileNameDisplay.style.display = 'none';
      imagePreview.style.display = 'none';
    }
  });

  // Form submit → call Vision API
  uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (fileInput.files.length === 0) {
      alert('Please select an image first.');
      return;
    }

    const file = fileInput.files[0];

    // Basic validation
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/tiff'];
    if (!validTypes.includes(file.type)) {
      alert('Please select a valid image (JPEG, PNG, GIF, BMP, or TIFF).');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      alert('File is too large. Max 20MB.');
      return;
    }

    loader.style.display = 'flex';
    submitBtn.disabled = true;

    try {
      // Clear any previous data
      sessionStorage.clear();

      // Preview data stored
      const imageDataUrl = await fileToDataURL(file);
      sessionStorage.setItem('processedImage', imageDataUrl);
      sessionStorage.setItem('imageInfo', JSON.stringify({
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified
      }));

      // File to base64 (without prefix)
      const base64Image = await fileToBase64Content(file);

      const selectedLang = ocrLanguageSelect.value;
      const languageHints = selectedLang ? [selectedLang] : ['en', 'hi', 'es', 'fr'];

      const requestBody = {
        requests: [
          {
            image: { content: base64Image },
            features: [
              {
                type: 'TEXT_DETECTION',
                maxResults: 1
              }
            ],
            imageContext: {
              languageHints
            }
          }
        ]
      };

      const response = await fetch(`${GOOGLE_VISION_API_URL}?key=${GOOGLE_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      console.log('Vision response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Vision API error:', errorText);
        sessionStorage.setItem('extractedText',
          `Google Vision API error (${response.status}):\n${errorText}`);
        sessionStorage.setItem('extractionStatus', 'error');
      } else {
        const data = await response.json();
        console.log('Vision API data:', data);

        const res0 = data.responses && data.responses[0];

        if (res0?.error) {
          sessionStorage.setItem('extractedText',
            `Vision API error: ${res0.error.message || 'Unknown error.'}`);
          sessionStorage.setItem('extractionStatus', 'error');
        } else if (res0?.textAnnotations && res0.textAnnotations.length > 0) {
          let rawText = res0.textAnnotations[0].description || '';
          rawText = cleanExtractedText(rawText);

          sessionStorage.setItem('extractedText', rawText);
          sessionStorage.setItem('extractionStatus', 'success');
        } else {
          sessionStorage.setItem('extractedText',
            'No text detected in the image.\n\nTips:\n• Ensure the text is large and clear\n• Avoid blur and glare\n• Try a higher resolution image');
          sessionStorage.setItem('extractionStatus', 'no-text');
        }
      }

      // Redirect to result page
      window.location.href = 'result.html';

    } catch (err) {
      console.error('Unexpected error:', err);
      sessionStorage.setItem(
        'extractedText',
        `Unexpected error: ${err.message}\n\nCheck console logs for more details.`
      );
      sessionStorage.setItem('extractionStatus', 'error');
      window.location.href = 'result.html';
    } finally {
      loader.style.display = 'none';
      submitBtn.disabled = false;
    }
  });
});

// Convert file to Data URL (for preview)
function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

// Convert file to base64 *content* only (strip prefix)
function fileToBase64Content(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (!result || typeof result !== 'string') {
        reject(new Error('Invalid file read result.'));
        return;
      }
      const base64Part = result.split(',')[1];
      if (!base64Part) {
        reject(new Error('Failed to extract base64 data.'));
        return;
      }
      resolve(base64Part);
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

// Clean OCR text a bit
function cleanExtractedText(text) {
  if (!text) return '';
  text = text.replace(/\r\n/g, '\n');
  text = text.replace(/\r/g, '\n');
  text = text.replace(/\n{3,}/g, '\n\n');
  text = text.replace(/[ \t]{2,}/g, ' ');
  return text.trim();
}

// Drag & drop helpers
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
  if (!files || files.length === 0) return;

  const file = files[0];

  const fileInput = document.getElementById('file-input');
  const fileNameDisplay = document.getElementById('file-name');
  const imagePreview = document.getElementById('image-preview');

  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/tiff'];
  if (!validTypes.includes(file.type)) {
    alert('Please select a valid image (JPEG, PNG, GIF, BMP, or TIFF).');
    return;
  }
  if (file.size > 20 * 1024 * 1024) {
    alert('File is too large. Max 20MB.');
    return;
  }

  // Put files into hidden input so form submit works
  const dataTransfer = new DataTransfer();
  dataTransfer.items.add(file);
  fileInput.files = dataTransfer.files;

  fileNameDisplay.textContent = 'Selected: ' + file.name;
  fileNameDisplay.style.display = 'block';
  previewImage(file, imagePreview);
}

// Image preview
function previewImage(file, imagePreview) {
  const reader = new FileReader();
  reader.onload = (e) => {
    imagePreview.src = e.target.result;
    imagePreview.style.display = 'block';
  };
  reader.readAsDataURL(file);
}
