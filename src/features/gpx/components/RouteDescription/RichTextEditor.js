import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useRef } from 'react';
import { Editor, EditorState, RichUtils, convertToRaw, convertFromRaw } from 'draft-js';
import { Box, IconButton, Divider } from '@mui/material';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatUnderlinedIcon from '@mui/icons-material/FormatUnderlined';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import 'draft-js/dist/Draft.css';
export const RichTextEditor = ({ value, onChange }) => {
    const [editorState, setEditorState] = React.useState(() => {
        if (value) {
            try {
                const contentState = convertFromRaw(JSON.parse(value));
                return EditorState.createWithContent(contentState);
            }
            catch {
                return EditorState.createEmpty();
            }
        }
        return EditorState.createEmpty();
    });
    const editorRef = useRef(null);
    useEffect(() => {
        // When value prop changes and it's different from current state
        const currentContent = JSON.stringify(convertToRaw(editorState.getCurrentContent()));
        if (value && value !== currentContent) {
            try {
                const contentState = convertFromRaw(JSON.parse(value));
                setEditorState(EditorState.createWithContent(contentState));
            }
            catch {
                // If parsing fails, keep current state
            }
        }
    }, [value]);
    const handleEditorChange = (newState) => {
        setEditorState(newState);
        const content = convertToRaw(newState.getCurrentContent());
        onChange(JSON.stringify(content));
    };
    const handleKeyCommand = (command, state) => {
        const newState = RichUtils.handleKeyCommand(state, command);
        if (newState) {
            handleEditorChange(newState);
            return 'handled';
        }
        return 'not-handled';
    };
    const toggleInlineStyle = (style) => {
        handleEditorChange(RichUtils.toggleInlineStyle(editorState, style));
    };
    const toggleBlockType = (blockType) => {
        handleEditorChange(RichUtils.toggleBlockType(editorState, blockType));
    };
    const focusEditor = () => {
        editorRef.current?.focus();
    };
    const currentInlineStyle = editorState.getCurrentInlineStyle();
    return (_jsxs(Box, { sx: {
            backgroundColor: 'rgb(35, 35, 35)',
            color: 'white',
            height: '100%',
            display: 'flex',
            flexDirection: 'column'
        }, children: [_jsxs(Box, { sx: {
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    backgroundColor: 'rgb(35, 35, 35)',
                    padding: 1,
                    borderRadius: 1,
                    borderBottom: '1px solid rgb(70, 70, 70)'
                }, children: [_jsxs(Box, { sx: { display: 'flex', gap: 0.5 }, children: [_jsx(IconButton, { size: "small", color: "info", onClick: () => toggleInlineStyle('BOLD'), sx: {
                                    color: currentInlineStyle.has('BOLD') ? 'rgb(41, 182, 246)' : 'rgb(255, 255, 255)',
                                    '&:hover': {
                                        backgroundColor: 'rgba(41, 182, 246, 0.1)'
                                    }
                                }, children: _jsx(FormatBoldIcon, { fontSize: "small" }) }), _jsx(IconButton, { size: "small", color: "info", onClick: () => toggleInlineStyle('ITALIC'), sx: {
                                    color: currentInlineStyle.has('ITALIC') ? 'rgb(41, 182, 246)' : 'rgb(255, 255, 255)',
                                    '&:hover': {
                                        backgroundColor: 'rgba(41, 182, 246, 0.1)'
                                    }
                                }, children: _jsx(FormatItalicIcon, { fontSize: "small" }) }), _jsx(IconButton, { size: "small", color: "info", onClick: () => toggleInlineStyle('UNDERLINE'), sx: {
                                    color: currentInlineStyle.has('UNDERLINE') ? 'rgb(41, 182, 246)' : 'rgb(255, 255, 255)',
                                    '&:hover': {
                                        backgroundColor: 'rgba(41, 182, 246, 0.1)'
                                    }
                                }, children: _jsx(FormatUnderlinedIcon, { fontSize: "small" }) })] }), _jsx(Divider, { orientation: "vertical", flexItem: true, sx: { borderColor: 'rgb(70, 70, 70)' } }), _jsxs(Box, { sx: { display: 'flex', gap: 0.5 }, children: [_jsx(IconButton, { size: "small", color: "info", onClick: () => toggleBlockType('unordered-list-item'), sx: {
                                    color: 'rgb(255, 255, 255)',
                                    '&:hover': {
                                        backgroundColor: 'rgba(41, 182, 246, 0.1)'
                                    }
                                }, children: _jsx(FormatListBulletedIcon, { fontSize: "small" }) }), _jsx(IconButton, { size: "small", color: "info", onClick: () => toggleBlockType('ordered-list-item'), sx: {
                                    color: 'rgb(255, 255, 255)',
                                    '&:hover': {
                                        backgroundColor: 'rgba(41, 182, 246, 0.1)'
                                    }
                                }, children: _jsx(FormatListNumberedIcon, { fontSize: "small" }) })] })] }), _jsx(Box, { onClick: focusEditor, sx: {
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
                        color: 'white'
                    }
                }, children: _jsx(Editor, { ref: editorRef, editorState: editorState, onChange: handleEditorChange, handleKeyCommand: handleKeyCommand, placeholder: "Enter description..." }) })] }));
};
