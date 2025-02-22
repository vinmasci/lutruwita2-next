import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Heading from '@tiptap/extension-heading';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Placeholder from '@tiptap/extension-placeholder';
import { Box, IconButton, Divider, Menu, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button } from '@mui/material';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatUnderlinedIcon from '@mui/icons-material/FormatUnderlined';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import TitleIcon from '@mui/icons-material/Title';
import LinkIcon from '@mui/icons-material/Link';
import FormatColorTextIcon from '@mui/icons-material/FormatColorText';
import BorderColorIcon from '@mui/icons-material/BorderColor';

const BACKGROUND_COLOR = 'rgba(26, 26, 26, 0.9)';
const EDITOR_BACKGROUND = 'rgb(35, 35, 35)';
const BUTTON_COLOR = '#2196f3'; // Material UI Blue

const textColors = {
    'White': '#ffffff',
    'Black': '#000000',
    'Red': '#f44336',
    'Blue': '#2196f3',
    'Green': '#4caf50',
    'Yellow': '#ffeb3b'
};

const highlightColors = {
    'No Highlight': null,
    'Red': '#f44336',
    'Blue': '#2196f3',
    'Green': '#4caf50',
    'Yellow': '#ffeb3b'
};

export const RichTextEditor = ({ value, onChange }) => {
    const [textColorMenuAnchor, setTextColorMenuAnchor] = useState(null);
    const [highlightMenuAnchor, setHighlightMenuAnchor] = useState(null);
    const [linkDialogOpen, setLinkDialogOpen] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                bulletList: {
                    keepMarks: true,
                    keepAttributes: false
                },
                orderedList: {
                    keepMarks: true,
                    keepAttributes: false
                }
            }),
            Underline,
            Link.configure({
                openOnClick: true,
                HTMLAttributes: {
                    style: 'color: #2196f3; text-decoration: underline; transition: opacity 0.2s;',
                    class: 'hover:opacity-80'
                }
            }),
            TextStyle,
            Color,
            Heading.configure({
                levels: [1, 2, 3]
            }),
            Highlight.configure({
                multicolor: true
            }),
            Placeholder.configure({
                placeholder: 'Enter description...',
                showOnlyWhenEditable: true
            })
        ],
        content: value || '',
        onUpdate: ({ editor }) => {
            const html = editor.getHTML();
            onChange(html);
        }
    });

    React.useEffect(() => {
        return () => {
            if (editor) {
                editor.destroy();
            }
        };
    }, [editor]);

    React.useEffect(() => {
        if (editor && value !== editor.getHTML()) {
            editor.commands.setContent(value || '');
        }
    }, [editor, value]);

    if (!editor) {
        return null;
    }

    const handleHeadingClick = (level) => {
        editor.chain().focus().toggleHeading({ level }).run();
    };

    const handleLinkClick = () => {
        const previousUrl = editor.getAttributes('link').href;
        setLinkUrl(previousUrl || '');
        setLinkDialogOpen(true);
    };

    const handleLinkSubmit = () => {
        if (linkUrl === '') {
            editor.chain().focus().unsetLink().run();
        } else {
            editor.chain().focus().setLink({ href: linkUrl }).run();
        }
        setLinkDialogOpen(false);
    };

    const handleHighlightClick = (color) => {
        if (color === null) {
            editor.chain().focus().unsetHighlight().run();
        } else {
            editor.chain().focus().toggleHighlight({ color }).run();
        }
        setHighlightMenuAnchor(null);
    };

    const handleTextColorClick = (color) => {
        editor.chain().focus().setColor(color).run();
        setTextColorMenuAnchor(null);
    };

    return (_jsxs(Box, {
        sx: {
            backgroundColor: EDITOR_BACKGROUND,
            color: 'white',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            fontFamily: 'Futura, sans-serif'
        },
        children: [
            _jsxs(Box, {
                sx: {
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    backgroundColor: EDITOR_BACKGROUND,
                    padding: 1,
                    borderRadius: 1,
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                },
                children: [
                    _jsxs(Box, {
                        sx: { display: 'flex', gap: 0.5 },
                        children: [
                            _jsx(IconButton, {
                                size: "small",
                                onClick: () => editor.chain().focus().toggleBold().run(),
                                sx: {
                                    color: editor.isActive('bold') ? BUTTON_COLOR : 'white',
                                    '&:hover': {
                                        backgroundColor: 'rgba(33, 150, 243, 0.1)'
                                    }
                                },
                                children: _jsx(FormatBoldIcon, { fontSize: "small" })
                            }),
                            _jsx(IconButton, {
                                size: "small",
                                onClick: () => editor.chain().focus().toggleItalic().run(),
                                sx: {
                                    color: editor.isActive('italic') ? BUTTON_COLOR : 'white',
                                    '&:hover': {
                                        backgroundColor: 'rgba(33, 150, 243, 0.1)'
                                    }
                                },
                                children: _jsx(FormatItalicIcon, { fontSize: "small" })
                            }),
                            _jsx(IconButton, {
                                size: "small",
                                onClick: () => editor.chain().focus().toggleUnderline().run(),
                                sx: {
                                    color: editor.isActive('underline') ? BUTTON_COLOR : 'white',
                                    '&:hover': {
                                        backgroundColor: 'rgba(33, 150, 243, 0.1)'
                                    }
                                },
                                children: _jsx(FormatUnderlinedIcon, { fontSize: "small" })
                            })
                        ]
                    }),
                    _jsx(Divider, {
                        orientation: "vertical",
                        flexItem: true,
                        sx: { borderColor: 'rgba(255, 255, 255, 0.1)' }
                    }),
                    _jsxs(Box, {
                        sx: { display: 'flex', gap: 0.5 },
                        children: [
                            _jsx(IconButton, {
                                size: "small",
                                onClick: () => editor.chain().focus().toggleBulletList().run(),
                                sx: {
                                    color: editor.isActive('bulletList') ? BUTTON_COLOR : 'white',
                                    '&:hover': {
                                        backgroundColor: 'rgba(33, 150, 243, 0.1)'
                                    }
                                },
                                children: _jsx(FormatListBulletedIcon, { fontSize: "small" })
                            }),
                            _jsx(IconButton, {
                                size: "small",
                                onClick: () => editor.chain().focus().toggleOrderedList().run(),
                                sx: {
                                    color: editor.isActive('orderedList') ? BUTTON_COLOR : 'white',
                                    '&:hover': {
                                        backgroundColor: 'rgba(33, 150, 243, 0.1)'
                                    }
                                },
                                children: _jsx(FormatListNumberedIcon, { fontSize: "small" })
                            })
                        ]
                    }),
                    _jsx(Divider, {
                        orientation: "vertical",
                        flexItem: true,
                        sx: { borderColor: 'rgba(255, 255, 255, 0.1)' }
                    }),
                    _jsxs(Box, {
                        sx: { display: 'flex', gap: 0.5 },
                        children: [
                            _jsx(IconButton, {
                                size: "small",
                                onClick: () => handleHeadingClick(1),
                                sx: {
                                    color: editor.isActive('heading', { level: 1 }) ? BUTTON_COLOR : 'white',
                                    '&:hover': {
                                        backgroundColor: 'rgba(33, 150, 243, 0.1)'
                                    }
                                },
                                children: _jsx(TitleIcon, { fontSize: "small" })
                            }),
                            _jsx(IconButton, {
                                size: "small",
                                onClick: handleLinkClick,
                                sx: {
                                    color: editor.isActive('link') ? BUTTON_COLOR : 'white',
                                    '&:hover': {
                                        backgroundColor: 'rgba(33, 150, 243, 0.1)'
                                    }
                                },
                                children: _jsx(LinkIcon, { fontSize: "small" })
                            }),
                            _jsx(IconButton, {
                                size: "small",
                                onClick: (e) => setTextColorMenuAnchor(e.currentTarget),
                                sx: {
                                    color: editor.isActive('textStyle') ? BUTTON_COLOR : 'white',
                                    '&:hover': {
                                        backgroundColor: 'rgba(33, 150, 243, 0.1)'
                                    }
                                },
                                children: _jsx(FormatColorTextIcon, { fontSize: "small" })
                            }),
                            _jsx(IconButton, {
                                size: "small",
                                onClick: (e) => setHighlightMenuAnchor(e.currentTarget),
                                sx: {
                                    color: editor.isActive('highlight') ? BUTTON_COLOR : 'white',
                                    '&:hover': {
                                        backgroundColor: 'rgba(33, 150, 243, 0.1)'
                                    }
                                },
                                children: _jsx(BorderColorIcon, { fontSize: "small" })
                            })
                        ]
                    })
                ]
            }),
            _jsx(Box, {
                sx: {
                    flex: 1,
                    padding: 2,
                    cursor: 'text',
                    backgroundColor: EDITOR_BACKGROUND,
                    '& .ProseMirror': {
                        height: '100%',
                        color: 'white',
                        fontFamily: 'Futura, sans-serif',
                        '&:focus': {
                            outline: 'none'
                        },
                        '& ul, & ol': {
                            paddingLeft: '1.5rem'
                        },
                        '& h1': {
                            fontSize: '1.5rem',
                            fontWeight: 'bold',
                            marginBottom: '0.5rem',
                            fontFamily: 'Futura, sans-serif'
                        },
                        '& h2': {
                            fontSize: '1.25rem',
                            fontWeight: 'bold',
                            marginBottom: '0.5rem',
                            fontFamily: 'Futura, sans-serif'
                        },
                        '& h3': {
                            fontSize: '1.1rem',
                            fontWeight: 'bold',
                            marginBottom: '0.5rem',
                            fontFamily: 'Futura, sans-serif'
                        }
                    },
                    '& .ProseMirror p.is-editor-empty:first-child::before': {
                        color: 'rgba(255, 255, 255, 0.5)',
                        content: 'attr(data-placeholder)',
                        float: 'left',
                        height: 0,
                        pointerEvents: 'none',
                        fontFamily: 'Futura, sans-serif'
                    }
                },
                children: _jsx(EditorContent, { editor: editor })
            }),
            _jsx(Menu, {
                anchorEl: textColorMenuAnchor,
                open: Boolean(textColorMenuAnchor),
                onClose: () => setTextColorMenuAnchor(null),
                sx: {
                    '& .MuiPaper-root': {
                        backgroundColor: EDITOR_BACKGROUND,
                        color: 'white',
                        fontFamily: 'Futura, sans-serif'
                    }
                },
                children: _jsxs(Box, {
                    sx: { minWidth: 200 },
                    children: [
                        _jsx(Box, {
                            sx: { p: 1, borderBottom: '1px solid rgba(255, 255, 255, 0.1)' },
                            children: "Text Colors"
                        }),
                        Object.entries(textColors).map(([name, color]) => (
                            _jsx(MenuItem, {
                                onClick: () => handleTextColorClick(color),
                                sx: {
                                    color: color,
                                    fontFamily: 'Futura, sans-serif',
                                    '&:hover': {
                                        backgroundColor: 'rgba(33, 150, 243, 0.1)'
                                    }
                                },
                                children: name
                            }, color)
                        ))
                    ]
                })
            }),
            _jsx(Menu, {
                anchorEl: highlightMenuAnchor,
                open: Boolean(highlightMenuAnchor),
                onClose: () => setHighlightMenuAnchor(null),
                sx: {
                    '& .MuiPaper-root': {
                        backgroundColor: EDITOR_BACKGROUND,
                        color: 'white',
                        fontFamily: 'Futura, sans-serif'
                    }
                },
                children: Object.entries(highlightColors).map(([name, color]) => (
                    _jsx(MenuItem, {
                        onClick: () => handleHighlightClick(color),
                        sx: {
                            backgroundColor: color || 'transparent',
                            color: name === 'Yellow' ? 'black' : 'white',
                            fontFamily: 'Futura, sans-serif',
                            '&:hover': {
                                backgroundColor: color || 'rgba(33, 150, 243, 0.1)',
                                opacity: color ? 0.8 : 1
                            }
                        },
                        children: name
                    }, name)
                ))
            }),
            _jsx(Dialog, {
                open: linkDialogOpen,
                onClose: () => setLinkDialogOpen(false),
                PaperProps: {
                    sx: {
                        backgroundColor: EDITOR_BACKGROUND,
                        color: 'white',
                        fontFamily: 'Futura, sans-serif'
                    }
                },
                children: _jsxs(Box, { 
                    sx: { padding: 2 },
                    children: [
                        _jsx(DialogTitle, { 
                            children: "Add Link" 
                        }),
                        _jsx(DialogContent, {
                            children: _jsx(TextField, {
                                autoFocus: true,
                                margin: "dense",
                                label: "URL",
                                type: "url",
                                fullWidth: true,
                                value: linkUrl,
                                onChange: (e) => setLinkUrl(e.target.value),
                                variant: "outlined",
                                sx: {
                                    '& .MuiOutlinedInput-root': {
                                        color: 'white',
                                        fontFamily: 'Futura, sans-serif',
                                        '& fieldset': {
                                            borderColor: 'rgba(255, 255, 255, 0.1)'
                                        },
                                        '&:hover fieldset': {
                                            borderColor: 'rgba(255, 255, 255, 0.2)'
                                        },
                                        '&.Mui-focused fieldset': {
                                            borderColor: BUTTON_COLOR
                                        }
                                    },
                                    '& .MuiInputLabel-root': {
                                        color: 'rgba(255, 255, 255, 0.5)',
                                        fontFamily: 'Futura, sans-serif'
                                    }
                                }
                            })
                        }),
                        _jsxs(DialogActions, {
                            children: [
                                _jsx(Button, {
                                    onClick: () => setLinkDialogOpen(false),
                                    sx: { 
                                        color: 'white',
                                        fontFamily: 'Futura, sans-serif'
                                    },
                                    children: "Cancel"
                                }),
                                _jsx(Button, {
                                    onClick: handleLinkSubmit,
                                    sx: {
                                        color: BUTTON_COLOR,
                                        fontFamily: 'Futura, sans-serif'
                                    },
                                    children: "Add"
                                })
                            ]
                        })
                    ]
                })
            })
        ]
    }));
};
