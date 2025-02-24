import { useState } from 'react';
import { useGpxProcessingApi } from '../services/gpxService';
export const useGpxProcessing = () => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [debugLog, setDebugLog] = useState([]);
    const { processGpxFile: apiProcessGpx } = useGpxProcessingApi();
    const addDebugMessage = (message) => {
        setDebugLog(prev => [...prev, `${new Date().toISOString()}: ${message}`]);
    };
    const processGpxFile = async (file) => {
        setIsProcessing(true);
        setDebugLog([]);
        try {
            addDebugMessage(`Starting processing for ${file.name}`);
            const result = await apiProcessGpx(file, (progress) => {
                addDebugMessage(`Map matching progress: ${Math.round(progress * 100)}%`);
            });
            addDebugMessage(`Processing completed successfully`);
            return {
                ...result,
                id: crypto.randomUUID(),
                name: file.name.replace('.gpx', ''),
                color: '#3b82f6',
                isVisible: true
            };
        }
        catch (error) {
            addDebugMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            console.error('GPX Processing Error:', error);
            return null;
        }
        finally {
            setIsProcessing(false);
        }
    };
    return {
        processGpxFile,
        isProcessing,
        debugLog,
        clearDebugLog: () => setDebugLog([])
    };
};
