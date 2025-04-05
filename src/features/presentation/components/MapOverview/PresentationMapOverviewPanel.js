import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import { getMapOverviewData } from '../../../presentation/store/mapOverviewStore';

const EDITOR_BACKGROUND = 'rgb(35, 35, 35)';

const OverviewContent = styled('div')({
  width: '100%',
  height: '100%',
  padding: 0,
  backgroundColor: '#1a1a1a'
});

/**
 * Map Overview Panel component for presentation mode
 * Displays the global map overview content that applies to the entire file
 */
export const PresentationMapOverviewPanel = () => {
  const mapOverview = getMapOverviewData();

  return _jsxs("div", {
    className: "map-overview",
    children: [
      _jsxs(OverviewContent, {
        children: [
          _jsxs(Box, {
            sx: { 
              px: 2, 
              py: 1, 
              display: 'flex', 
              alignItems: 'center', 
              backgroundColor: '#1a1a1a',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)' 
            },
            children: [
              _jsx(Typography, 
                {
                  variant: "subtitle2", 
                  color: "white", 
                  sx: { 
                    fontSize: '0.8rem', 
                    fontWeight: 500, 
                    mr: 3, 
                    fontFamily: 'Futura' 
                  },
                  children: "Map Overview"
                }
              )
            ]
          }),
          _jsx(Box, {
            sx: {
              height: 'calc(100% - 40px)', // Subtract header height
              overflow: 'hidden',
              p: 2
            },
            children: _jsx(Box, {
              sx: {
                width: '100%',
                height: '100%',
                backgroundColor: EDITOR_BACKGROUND,
                padding: 2,
                overflowY: 'auto',
                color: 'white',
                fontFamily: 'Futura, sans-serif',
                '& a': {
                  color: '#2196f3',
                  textDecoration: 'underline'
                }
              },
              dangerouslySetInnerHTML: {
                __html: mapOverview?.description || '<p>No map overview content available.</p>'
              }
            })
          })
        ]
      })
    ]
  });
};
