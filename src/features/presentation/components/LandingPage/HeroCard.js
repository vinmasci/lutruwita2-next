import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { Box, Typography, Button, Card, CardContent } from '@mui/material';
import { styled } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';

const StyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  transition: 'transform 0.2s ease-in-out',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[4]
  },
  position: 'relative',
  overflow: 'hidden'
}));

const HeroBackground = styled(Box)({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundImage: 'url(/images/hero.png)',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  filter: 'brightness(0.55)',
  zIndex: 0
});

const HeroCard = () => {
  const navigate = useNavigate();
  
  const goToEditor = () => {
    navigate('/editor');
  };
  
  return _jsxs(StyledCard, {
    children: [
      _jsx(HeroBackground, {}),
      _jsxs(CardContent, {
        sx: { 
          position: 'relative', 
          zIndex: 1, 
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '24px'
        },
        children: [
          _jsx(Typography, {
            variant: "h4",
            component: "h1",
            gutterBottom: true,
            sx: {
              fontFamily: 'Montserrat',
              fontWeight: 'bold',
              mb: 2,
              color: 'white',
              textShadow: '2px 2px 8px rgba(0, 0, 0, 0.8)',
              backgroundColor: 'rgba(0, 0, 0, 0.2)',
              borderRadius: '16px',
              padding: '16px',
              textAlign: 'center'
            },
            children: "Create Beautiful Maps"
          }),
          
          _jsx(Typography, {
            variant: "body1",
            sx: {
              fontFamily: 'Montserrat',
              mb: 3,
              color: 'white',
              textShadow: '1px 1px 4px rgba(0, 0, 0, 0.8)',
              backgroundColor: 'rgba(0, 0, 0, 0.2)',
              borderRadius: '12px',
              padding: '12px',
              textAlign: 'center'
            },
            children: "Create & share beautiful cycling, hiking or tourism maps with 3d terrain, points of interest, photos and much more.."
          }),
          
          _jsx(Button, {
            variant: "outlined",
            size: "large",
            sx: {
              px: 4,
              py: 1.5,
              fontSize: '1.1rem',
              fontFamily: 'Montserrat',
              minWidth: '200px',
              color: 'white',
              borderColor: 'white',
              borderWidth: 2,
              bgcolor: 'rgba(0, 0, 0, 0.3)',
              '&:hover': {
                bgcolor: 'rgba(255, 255, 255, 0.05)',
                borderColor: 'white',
                borderWidth: 2
              }
            },
            onClick: goToEditor,
            children: "Create A Map"
          })
        ]
      })
    ]
  });
};

export default HeroCard;
