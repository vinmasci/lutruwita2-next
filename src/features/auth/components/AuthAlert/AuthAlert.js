import { jsx as _jsx } from "react/jsx-runtime";
import { Snackbar, Alert } from '@mui/material';
export function AuthAlert({ show, onClose }) {
    return (_jsx(Snackbar, { open: show, autoHideDuration: 5000, onClose: onClose, anchorOrigin: { vertical: 'bottom', horizontal: 'right' }, children: _jsx(Alert, { onClose: onClose, severity: "error", variant: "filled", sx: {
                width: '100%',
                backgroundColor: 'rgb(22, 11, 11)',
                color: '#fff',
                '& .MuiAlert-icon': {
                    color: '#f44336'
                }
            }, children: "Please sign in to create or modify routes" }) }));
}
