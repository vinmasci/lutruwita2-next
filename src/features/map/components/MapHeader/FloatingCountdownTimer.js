import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import { Box } from '@mui/material';
import CountdownTimer from './CountdownTimer';

/**
 * FloatingCountdownTimer component displays a countdown timer that floats over the map
 * just underneath the header navbar
 * @param {Date} eventDate - The date to count down to
 */
const FloatingCountdownTimer = ({ eventDate }) => {
  if (!eventDate) return null;

  return (
     _jsx(Box, {
       sx: {
         position: 'absolute',
         top: '72px', // Position just below the NEW header navbar height
         right: '5px', // Position on the right side
         marginRight: '60px', // Add margin to avoid overlapping with map controls
         zIndex: 900, // Below header (1000) but above map (1)
         marginTop: '8px', // Small gap from header
         boxShadow: '0 2px 8px rgba(0,0,0,0.3)', // Add shadow for visibility
         borderRadius: '4px', // Rounded corners
         backgroundColor: 'rgba(0, 0, 0, 0.5)', // More transparent background (0.8 opacity for the component overall)
         padding: '4px 12px', // More horizontal padding
         backdropFilter: 'blur(2px)', // Blur effect for modern browsers
         border: '1px solid rgba(255, 255, 255, 0.2)', // Subtle border
      },
      children: _jsx(CountdownTimer, { eventDate })
    })
  );
};

export default FloatingCountdownTimer;
