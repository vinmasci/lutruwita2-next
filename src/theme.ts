/**
 * THIS FILE IS LIKELY REDUNDANT
 * Please use the JavaScript version (theme.js) if it exists.
 * This TypeScript file may be part of an incomplete migration.
 */

import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          '&.upload-box': {
            backgroundColor: '#2a2a2a',
            border: '2px dashed #444',
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              backgroundColor: '#333',
              borderColor: '#666',
            },
            '&.dragover': {
              backgroundColor: '#333',
              borderColor: '#ee5253',
            }
          }
        }
      }
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: '#ee5253',
          color: '#ffffff',
          fontSize: '0.75rem',
          padding: '6px 10px'
        },
        arrow: {
          color: '#ee5253'
        }
      }
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: '#2a2a2a !important',
            '@media (hover: hover)': {
              backgroundColor: '#2a2a2a !important'
            }
          }
        }
      }
    }
  },
  palette: {
    mode: 'dark',
    background: {
      default: '#121212',
      paper: '#1e1e1e'
    },
    action: {
      hover: '#2a2a2a'
    }
  }
});
