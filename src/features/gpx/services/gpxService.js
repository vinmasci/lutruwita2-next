export const useGpxProcessingApi = () => {
    const API_BASE = 'http://localhost:3002/api/gpx';
    const processGpxFile = async (file, onProgress) => {
        const formData = new FormData();
        formData.append('gpxFile', file);
        try {
            console.log('Starting GPX file upload...');
            return new Promise((resolve, reject) => {
                // Send the file data first to get uploadId
                fetch(`${API_BASE}/upload`, {
                    method: 'POST',
                    body: formData
                })
                    .then(response => response.json())
                    .then(data => {
                    if (!data.uploadId) {
                        throw new Error('No upload ID received from server');
                    }
                    // Now create EventSource with the uploadId
                    const eventSource = new EventSource(`${API_BASE}/progress/${data.uploadId}`);
                    eventSource.onmessage = (event) => {
                        const data = JSON.parse(event.data);
                        if (data.progress) {
                            onProgress?.(data.progress);
                            return;
                        }
                        if (data.error) {
                            eventSource.close();
                            reject(new Error(data.error));
                            return;
                        }
                        if (data.geojson) {
                            eventSource.close();
                            resolve({
                                ...data,
                                id: crypto.randomUUID(),
                                name: file.name.replace('.gpx', ''),
                                color: '#3b82f6',
                                isVisible: true
                            });
                        }
                    };
                    eventSource.onerror = (error) => {
                        eventSource.close();
                        reject(new Error('SSE connection failed'));
                    };
                })
                    .catch(error => {
                    reject(error);
                });
            });
        }
        catch (error) {
            console.error('GPX processing error:', error);
            throw error;
        }
    };
    return { processGpxFile };
};
