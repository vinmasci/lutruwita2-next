import React, { useState, useEffect } from 'react';
import { Typography, Box, TextField, Button } from '@mui/material';
import { DrawerHeader, DrawerContent, DrawerFooter, PreviewContainer } from './TextboxTabsDrawer.styles';
import { TabPointerDirections, TabColors } from '../../context/TextboxTabsContext.jsx';
import DirectionSelector from './DirectionSelector.jsx';
import ColorSelector from './ColorSelector.jsx';
import IconSelector from './IconSelector.jsx';
import TextboxTab from './TextboxTab.jsx';
import CloseIcon from '@mui/icons-material/Close';

// Component to create textbox tabs
const TextboxTabsCreator = ({ onSave, onBack }) => {
  const [tab, setTab] = useState({
    text: '',
    icon: null,
    pointerDirection: TabPointerDirections.RIGHT,
    backgroundColor: TabColors.DEFAULT
  });

  const handleSave = () => {
    if (tab.text.trim() === '') {
      // Don't save if text is empty
      return;
    }
    onSave(tab);
    // Reset form
    setTab({
      text: '',
      icon: null,
      pointerDirection: TabPointerDirections.RIGHT,
      backgroundColor: TabColors.DEFAULT
    });
  };

  return (
    <Box>
      <DrawerHeader>
        <Typography variant="h6" sx={{ color: 'white', fontWeight: 500 }}>
          Create Textbox Tab
        </Typography>
        <Button
          onClick={onBack}
          sx={{ color: 'white', minWidth: 'auto', padding: '4px' }}
        >
          <CloseIcon />
        </Button>
      </DrawerHeader>

      <DrawerContent>
        {/* Direction Selector */}
        <Box mb={3}>
          <Typography variant="subtitle1" mb={1} sx={{ color: 'white' }}>
            Select Pointer Direction
          </Typography>
          <DirectionSelector
            selectedDirection={tab.pointerDirection}
            onDirectionSelect={(direction) => setTab({ ...tab, pointerDirection: direction })}
          />
        </Box>

        {/* Color Selector */}
        <Box mb={3}>
          <Typography variant="subtitle1" mb={1} sx={{ color: 'white' }}>
            Select Background Color
          </Typography>
          <ColorSelector
            selectedColor={tab.backgroundColor}
            onColorSelect={(color) => setTab({ ...tab, backgroundColor: color })}
          />
        </Box>

        {/* Icon Selector */}
        <Box mb={3}>
          <Typography variant="subtitle1" mb={1} sx={{ color: 'white' }}>
            Select Icon (Optional)
          </Typography>
          <IconSelector
            selectedIcon={tab.icon}
            onIconSelect={(icon) => setTab({ ...tab, icon })}
          />
        </Box>

        {/* Text Input */}
        <Box mb={3}>
          <Typography variant="subtitle1" mb={1} sx={{ color: 'white' }}>
            Tab Text
          </Typography>
          <TextField
            fullWidth
            value={tab.text}
            onChange={(e) => setTab({ ...tab, text: e.target.value })}
            placeholder="Enter tab text"
            variant="outlined"
            sx={{
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                },
                '&:hover fieldset': {
                  borderColor: 'rgba(255, 255, 255, 0.5)',
                },
                '&.Mui-focused fieldset': {
                  borderColor: 'rgba(74, 158, 255, 0.7)',
                },
                color: 'white',
              },
              '& .MuiInputLabel-root': {
                color: 'rgba(255, 255, 255, 0.7)',
              },
            }}
          />
        </Box>

        {/* Preview */}
        <Box mb={3}>
          <Typography variant="subtitle1" mb={1} sx={{ color: 'white' }}>
            Preview
          </Typography>
          <PreviewContainer>
            <TextboxTab
              text={tab.text || "Tab Text"}
              icon={tab.icon}
              pointerDirection={tab.pointerDirection}
              backgroundColor={tab.backgroundColor}
            />
          </PreviewContainer>
        </Box>
      </DrawerContent>

      <DrawerFooter>
        <Button
          variant="contained"
          color="primary"
          fullWidth
          onClick={handleSave}
          disabled={tab.text.trim() === ''}
        >
          Create Tab
        </Button>
      </DrawerFooter>
    </Box>
  );
};

export default TextboxTabsCreator;
