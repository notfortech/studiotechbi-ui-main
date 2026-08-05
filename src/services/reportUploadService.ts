/**
 * Direct-to-blob upload for large Report Generator files. A SAS-signed PUT to Azure Blob Storage
 * needs nothing beyond the `x-ms-blob-type: BlockBlob` header and a PUT body -- deliberately using
 * plain XMLHttpRequest (for upload-progress events, which fetch() doesn't expose) instead of
 * pulling in @azure/storage-blob, which is a much heavier dependency than a single signed PUT
 * warrants and has known browser-bundling friction with Vite (Buffer/process polyfills).
 */
export function uploadFileToBlob(
  writeUrl: string,
  file: File,
  onProgress?: (loadedBytes: number, totalBytes: number) => void,
  signal?: AbortSignal
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', writeUrl, true);
    xhr.setRequestHeader('x-ms-blob-type', 'BlockBlob');
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

    xhr.upload.onprogress = (event) => {
      if (onProgress && event.lengthComputable) onProgress(event.loaded, event.total);
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Direct upload failed (HTTP ${xhr.status}).`));
      }
    };
    xhr.onerror = () => reject(new Error('Direct upload failed — network error.'));
    xhr.onabort = () => reject(new DOMException('Upload aborted', 'AbortError'));

    if (signal) {
      if (signal.aborted) {
        xhr.abort();
        return;
      }
      signal.addEventListener('abort', () => xhr.abort());
    }

    xhr.send(file);
  });
}
