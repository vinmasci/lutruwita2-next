import React, { createContext, useState, useContext, useEffect } from 'react';

const ProcessingContext = createContext({
  isProcessing: false,
  setIsProcessing: () => {},
  processingMessage: '',
  setProcessingMessage: () => {},
  processingProgress: 0,
  setProcessingProgress: () => {},
});

export const useProcessingContext = () => useContext(ProcessingContext);

export const ProcessingProvider = ({ children }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');
  const [processingProgress, setProcessingProgress] = useState(0);

  // Reset progress when processing starts/stops
  useEffect(() => {
    if (!isProcessing) {
      setProcessingProgress(0);
    }
  }, [isProcessing]);

  return (
    <ProcessingContext.Provider
      value={{
        isProcessing,
        setIsProcessing,
        processingMessage,
        setProcessingMessage,
        processingProgress,
        setProcessingProgress,
      }}
    >
      {children}
    </ProcessingContext.Provider>
  );
};
