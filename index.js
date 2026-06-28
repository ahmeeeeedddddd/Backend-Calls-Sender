const chokidar = require('chokidar');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const WATCH_DIR = 'C:\\Users\\Administrator\\Desktop\\recordings';
const COMPLETED_DIR = path.join(WATCH_DIR, 'completed');
const UPLOAD_URL = 'http://localhost:3001/ingestion/upload';

// Ensure the completed directory exists
if (!fs.existsSync(COMPLETED_DIR)) {
  fs.mkdirSync(COMPLETED_DIR, { recursive: true });
}

console.log(`Starting VoIP simulator...`);
console.log(`Watching directory: ${WATCH_DIR}`);
console.log(`Uploading to:   ${UPLOAD_URL}`);

// Initialize watcher
const watcher = chokidar.watch(WATCH_DIR, {
  ignored: /(^|[\/\\])\../, // ignore dotfiles
  persistent: true,
  depth: 0, // only watch the specified directory, ignore subdirectories like /completed
  awaitWriteFinish: {
    stabilityThreshold: 2000,
    pollInterval: 100
  }
});

watcher.on('add', async (filePath) => {
  // Only process .mp3 files
  if (path.extname(filePath).toLowerCase() !== '.mp3') {
    return;
  }

  console.log(`\n[EVENT] New MP3 file detected: ${filePath}`);
  
  try {
    const fileName = path.basename(filePath);
    const form = new FormData();
    
    // Append the file stream to the 'file' field
    form.append('file', fs.createReadStream(filePath), fileName);
    form.append('source', 'API_SIMULATOR');

    console.log(`[UPLOAD] Starting upload for ${fileName}...`);
    
    // Send POST request with multipart/form-data
    const response = await axios.post(UPLOAD_URL, form, {
      headers: {
        ...form.getHeaders()
      }
    });

    console.log(`[SUCCESS] Upload successful for ${fileName}`);
    console.log(`[API RESPONSE] Status: ${response.status}, Data: ${JSON.stringify(response.data)}`);

    // Move file to completed directory
    const destPath = path.join(COMPLETED_DIR, fileName);
    fs.renameSync(filePath, destPath);
    console.log(`[CLEANUP] Moved ${fileName} to ${COMPLETED_DIR}`);

  } catch (error) {
    console.error(`[ERROR] Failed to process ${filePath}:`);
    if (error.response) {
      console.error(`API response status: ${error.response.status}`);
      console.error(`API response data:`, error.response.data);
    } else {
      console.error(error.message);
    }
  }
});

watcher.on('error', error => console.error(`Watcher error: ${error}`));
