const GOOGLE_API_KEY = 'AIzaSyAySYZ8iGk7Mmjpnh1gnE0jKz_nyhQAQac';
const GOOGLE_TRANSLATE_API_URL = 'https://translation.googleapis.com/language/translate/v2';

document.addEventListener('DOMContentLoaded', () => {
  const backBtn = document.getElementById('back-btn');
  const processedImgEl = document.getElementById('processed-image');

  const charEl = document.getElementById('char-count');
  const wordEl = document.getElementById('word-count');
  const lineEl = document.getElementById('line-count');

  const extractedEl = document.getElementById('extracted-text');
  const statusChip = document.getElementById('status-chip');

  const copyBtn = document.getElementById('copy-btn');
  const downloadBtn = document.getElementById('download-btn');
  const editBtn = document.getElementById('edit-btn');
  const anotherBtn = document.getElementById('another-btn');

  const targetLanguageSelect = document.getElementById('target-language');
  const translateBtn = document.getElementById('translate-btn');
  const translateLoader = document.getElementById('translate-loader');
  const translatedEl = document.getElementById('translated-text');

  // Back / new image
  backBtn.addEventListener('click', () => {
    window.location.href = 'index.html';
  });

  anotherBtn.addEventListener('click', () => {
    sessionStorage.clear();
    window.location.href = 'index.html';
  });

  // Load image preview from sessionStorage (if present)
  const storedImage = sessionStorage.getItem('processedImage');
  if (storedImage) {
    processedImgEl.src = storedImage;
    processedImgEl.style.display = 'block';
  }

  // Load extracted text and status
  const text = sessionStorage.getItem('extractedText') || '';
  const status = sessionStorage.getItem('extractionStatus') || 'none';

  if (!text) {
    extractedEl.textContent = 'No extracted text found. Try uploading an image again.';
  } else {
    extractedEl.textContent = text;
  }

  // Status chip
  if (status === 'success') {
    statusChip.className = 'status-chip';
    statusChip.innerHTML = '<i class="fas fa-circle-check"></i> Text extracted';
  } else if (status === 'error') {
    statusChip.className = 'status-chip error';
    statusChip.innerHTML = '<i class="fas fa-triangle-exclamation"></i> Error during OCR';
  } else if (status === 'no-text') {
    statusChip.className = 'status-chip none';
    statusChip.innerHTML = '<i class="fas fa-circle-info"></i> No text detected';
  } else {
    statusChip.className = 'status-chip none';
    statusChip.innerHTML = '<i class="fas fa-circle-info"></i> Awaiting OCR…';
  }

  // Stats
  const charCount = text ? text.length : 0;
  const wordCount = text ? text.trim().split(/\s+/).filter(w => w.length > 0).length : 0;
  const lineCount = text ? text.split(/\n/).length : 0;

  animateNumber(charEl, charCount);
  animateNumber(wordEl, wordCount);
  animateNumber(lineEl, lineCount);

  // Copy button
  copyBtn.addEventListener('click', async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      const original = copyBtn.innerHTML;
      copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied';
      copyBtn.disabled = true;
      setTimeout(() => {
        copyBtn.innerHTML = original;
        copyBtn.disabled = false;
      }, 1600);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  });

  // Download button
  downloadBtn.addEventListener('click', () => {
    const blob = new Blob([text || ''], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `extracted_text_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  // Edit button
  editBtn.addEventListener('click', () => {
    const newWindow = window.open('', '_blank', 'width=900,height=700');
    if (!newWindow) return;
    const safeText = (text || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    newWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Edit extracted text</title>
          <style>
            body {
              margin: 0;
              font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              background: #020617;
              color: #e5e7eb;
              display: flex;
              flex-direction: column;
              height: 100vh;
            }
            header {
              padding: 10px 14px;
              border-bottom: 1px solid rgba(148, 163, 184, 0.4);
              background: #020617;
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 14px;
            }
            button {
              border-radius: 999px;
              border: 1px solid rgba(148, 163, 184, 0.7);
              background: #0f172a;
              color: #e5e7eb;
              padding: 6px 12px;
              cursor: pointer;
              font-size: 12px;
            }
            button:hover {
              border-color: #a5b4fc;
            }
            textarea {
              flex: 1;
              border: none;
              outline: none;
              resize: none;
              padding: 12px;
              font-family: 'JetBrains Mono', Menlo, Consolas, monospace;
              font-size: 13px;
              background: #020617;
              color: #e5e7eb;
            }
          </style>
        </head>
        <body>
          <header>
            <span>Editing extracted text</span>
            <div>
              <button onclick="downloadEdited()">Download .txt</button>
              <button onclick="window.close()">Close</button>
            </div>
          </header>
          <textarea id="editor">${safeText}</textarea>
          <script>
            function downloadEdited() {
              const txt = document.getElementById('editor').value;
              const blob = new Blob([txt], {type: 'text/plain;charset=utf-8'});
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'edited_text.txt';
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }
          </script>
        </body>
      </html>
    `);
  });

  // Translation
  translateBtn.addEventListener('click', async () => {
    if (!text) {
      translatedEl.textContent = 'No text available to translate.';
      return;
    }

    const targetLang = targetLanguageSelect.value || 'en';

    translateBtn.disabled = true;
    translateLoader.style.display = 'inline-flex';
    translatedEl.textContent = '';

    try {
      const translated = await translateText(text, targetLang);
      translatedEl.innerHTML = translated; // API returns HTML-escaped text
    } catch (err) {
      console.error('Translate error:', err);
      translatedEl.textContent =
        'Failed to translate text. Check that Cloud Translation API is enabled for this project.';
    } finally {
      translateBtn.disabled = false;
      translateLoader.style.display = 'none';
    }
  });
});

// Animate numbers for stats
function animateNumber(el, target) {
  let current = 0;
  const steps = 40;
  const increment = target / steps;
  const interval = setInterval(() => {
    current += increment;
    if (current >= target) {
      el.textContent = target;
      clearInterval(interval);
    } else {
      el.textContent = Math.floor(current);
    }
  }, 18);
}

// Call Google Translate API
async function translateText(text, targetLang) {
  const response = await fetch(`${GOOGLE_TRANSLATE_API_URL}?key=${GOOGLE_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      q: text,
      target: targetLang,
      format: 'text'
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Translate error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  if (!data.data || !data.data.translations || !data.data.translations[0]) {
    throw new Error('Unexpected translation API response format.');
  }

  return data.data.translations[0].translatedText || '';
}
