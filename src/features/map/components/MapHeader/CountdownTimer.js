import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import { Box, Typography, Tooltip } from '@mui/material';
import { Clock } from 'lucide-react';
import dayjs from 'dayjs';

/**
 * CountdownTimer component displays a countdown to a specific date
 * @param {Date} eventDate - The date to count down to
 */
const CountdownTimer = ({ eventDate }) => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isPast: false
  });

  useEffect(() => {
    if (!eventDate) return;

    const calculateTimeLeft = () => {
      const now = new Date();
      const targetDate = new Date(eventDate);
      const difference = targetDate - now;

      // Check if the event date is in the past
      if (difference <= 0) {
        return {
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          isPast: true
        };
      }

      // Calculate time units
      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      return {
        days,
        hours,
        minutes,
        seconds,
        isPast: false
      };
    };

    // Initial calculation
    setTimeLeft(calculateTimeLeft());

    // Update every second
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    // Clean up on unmount
    return () => clearInterval(timer);
  }, [eventDate]);

  // If no event date is provided, don't render anything
  if (!eventDate) return null;

  return (
    _jsxs(Box, {
      sx: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        borderRadius: '4px',
        padding: '4px 8px',
        marginLeft: { xs: '0', sm: '16px' },
        marginTop: { xs: '4px', sm: '0' }
      },
      children: [
        _jsxs(Box, {
          sx: {
            display: 'flex',
            alignItems: 'center',
            width: '100%',
            justifyContent: 'center'
          },
          children: [
            _jsx(Clock, {
              size: 16,
              color: '#ffffff',
              style: { marginRight: '4px' }
            }),
            _jsx(Typography, {
              variant: "body2",
              sx: {
                color: '#ffffff',
                fontWeight: 'bold',
                fontSize: '1rem' // Increase font size
              },
              children: timeLeft.isPast
                ? "Event has started!"
                : `${timeLeft.days}d ${timeLeft.hours}h ${timeLeft.minutes}m ${timeLeft.seconds}s`
            })
          ]
        }),
        _jsx(Typography, {
          variant: "caption",
          sx: {
            color: '#ffffff',
            fontSize: '0.75rem',
            marginTop: '2px',
            textAlign: 'center'
          },
          children: `Starts: ${dayjs(eventDate).format('DD/MM/YYYY HH:mm')}`
        })
      ]
    })
  );
};

export default CountdownTimer;
