import React, { useEffect, useRef, useState } from 'react';
import { Editor, EditorState, RichUtils, convertToRaw, convertFromRaw, Modifier } from 'draft-js';
import { Box, IconButton, Divider, Button } from '@mui/material';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatUnderlinedIcon from '@mui/icons-material/FormatUnderlined';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import KeyboardReturnIcon from '@mui/icons-material/KeyboardReturn';
import 'draft-js/dist/Draft.css';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange }) => {
  // ... (previous code remains the same until the return statement)

  return (
    <Box sx={{ 
      backgroundColor: 'rgb(35, 35, 35)',
      color: 'white',
      height: '100%',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Toolbar */}
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        backgroundColor: 'rgb(35, 35, 35)',
        padding: 1,
        borderRadius: 1,
        borderBottom: '1px solid rgb(70, 70, 70)'
      }}>
        {/* Text formatting */}
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <IconButton
            size="small"
            color="info"
            onClick={() => toggleInlineStyle('BOLD')}
            sx={{
              color: currentInlineStyle.has('BOLD') ? 'rgb(41, 182, 246)' : 'rgb(255, 255, 255)',
              '&:hover': {
                backgroundColor: 'rgba(41, 182, 246, 0.1)'
              }
            }}
          >
            <FormatBoldIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            color="info"
            onClick={() => toggleInlineStyle('ITALIC')}
            sx={{
              color: currentInlineStyle.has('ITALIC') ? 'rgb(41, 182, 246)' : 'rgb(255, 255, 255)',
              '&:hover': {
                backgroundColor: 'rgba(41, 182, 246, 0.1)'
              }
            }}
          >
            <FormatItalicIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            color="info"
            onClick={() => toggleInlineStyle('UNDERLINE')}
            sx={{
              color: currentInlineStyle.has('UNDERLINE') ? 'rgb(41, 182, 246)' : 'rgb(255, 255, 255)',
              '&:hover': {
                backgroundColor: 'rgba(41, 182, 246, 0.1)'
              }
            }}
          >
            <FormatUnderlinedIcon fontSize="small" />
          </IconButton>
        </Box>

        <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgb(70, 70, 70)' }} />

        {/* Lists */}
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <IconButton
            size="small"
            color="info"
            onClick={() => toggleBlockType('unordered-list-item')}
            sx={{
              color: currentBlockType === 'unordered-list-item' ? 'rgb(41, 182, 246)' : 'rgb(255, 255, 255)',
              '&:hover': {
                backgroundColor: 'rgba(41, 182, 246, 0.1)'
              }
            }}
          >
            <FormatListBulletedIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            color="info"
            onClick={() => toggleBlockType('ordered-list-item')}
            sx={{
              color: currentBlockType === 'ordered-list-item' ? 'rgb(41, 182, 246)' : 'rgb(255, 255, 255)',
              '&:hover': {
                backgroundColor: 'rgba(41, 182, 246, 0.1)'
              }
            }}
          >
            <FormatListNumberedIcon fontSize="small" />
          </IconButton>
        </Box>

        <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgb(70, 70, 70)' }} />

        {/* Line Break */}
        <Button
          size="small"
          variant="outlined"
          onClick={insertLineBreak}
          startIcon={<KeyboardReturnIcon />}
          sx={{
            color: 'rgb(255, 255, 255)',
            borderColor: 'rgb(70, 70, 70)',
            textTransform: 'none',
            minWidth: 'auto',
            padding: '4px 8px',
            '&:hover': {
              borderColor: 'rgb(41, 182, 246)',
              backgroundColor: 'rgba(41, 182, 246, 0.1)'
            }
          }}
        >
          Line Break
        </Button>
      </Box>

      {/* Editor */}
      <Box 
        onClick={focusEditor}
        sx={{ 
          flex: 1,
          padding: 2,
          cursor: 'text',
          '& .DraftEditor-root': {
            height: '100%'
          },
          '& .DraftEditor-editorContainer': {
            height: '100%'
          },
          '& .public-DraftEditor-content': {
            height: '100%',
            color: 'white',
            '& .public-DraftEditorPlaceholder-root': {
              color: 'rgba(255, 255, 255, 0.5)',
              position: 'absolute',
              display: hasText ? 'none' : 'block'
            },
            '& .public-DraftStyleDefault-unorderedListItem, & .public-DraftStyleDefault-orderedListItem': {
              marginLeft: '1.5em'
            }
          }
        }}
      >
        <Editor
          ref={editorRef}
          editorState={editorState}
          onChange={handleEditorChange}
          handleKeyCommand={handleKeyCommand}
          handleReturn={handleReturn}
          onTab={handleTab}
          placeholder="Enter description..."
        />
      </Box>
    </Box>
  );
};
