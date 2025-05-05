import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography } from '@mui/material';

/**
 * A component that displays console logs in real-time
 */
const ConsoleLogViewer = ({ maxHeight = '200px', maxLogs = 100 }) => {
  const [logs, setLogs] = useState([]);
  const logContainerRef = useRef(null);
  
  // Auto-scroll logs to bottom when they update
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);
  
  // Set up console log interception
  useEffect(() => {
    const originalConsole = {
      log: console.log,
      warn: console.warn,
      error: console.error
    };
    
    // Override console methods
    console.log = function(...args) {
      // Call original method
      originalConsole.log.apply(console, args);
      
      // Format the log message
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      
      // Add to logs state
      setLogs(prevLogs => {
        const newLogs = [...prevLogs, { type: 'log', message, timestamp: new Date() }];
        // Limit the number of logs to prevent memory issues
        return newLogs.slice(-maxLogs);
      });
    };
    
    console.warn = function(...args) {
      // Call original method
      originalConsole.warn.apply(console, args);
      
      // Format the log message
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      
      // Add to logs state
      setLogs(prevLogs => {
        const newLogs = [...prevLogs, { type: 'warn', message, timestamp: new Date() }];
        return newLogs.slice(-maxLogs);
      });
    };
    
    console.error = function(...args) {
      // Call original method
      originalConsole.error.apply(console, args);
      
      // Format the log message
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      
      // Add to logs state
      setLogs(prevLogs => {
        const newLogs = [...prevLogs, { type: 'error', message, timestamp: new Date() }];
        return newLogs.slice(-maxLogs);
      });
    };
    
    // Restore original console methods on unmount
    return () => {
      console.log = originalConsole.log;
      console.warn = originalConsole.warn;
      console.error = originalConsole.error;
    };
  }, [maxLogs]);
  
  return (
    <Box 
      ref={logContainerRef}
      sx={{ 
        maxHeight,
        overflowY: 'auto',
        marginTop: '16px',
        padding: '8px',
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        borderRadius: '4px',
        fontFamily: 'monospace',
        fontSize: '12px',
        color: 'rgba(255, 255, 255, 0.8)'
      }}
    >
      {logs.map((log, index) => (
        <Typography 
          key={index} 
          variant="body2" 
          sx={{ 
            margin: '2px 0',
            color: log.type === 'error' ? '#ff6b6b' : 
                   log.type === 'warn' ? '#feca57' : 
                   'rgba(255, 255, 255, 0.8)'
          }}
        >
          {log.message}
        </Typography>
      ))}
    </Box>
  );
};

export default ConsoleLogViewer;
