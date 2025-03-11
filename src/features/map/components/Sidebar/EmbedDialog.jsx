import { useState, useMemo } from 'react';
import { 
    Dialog, DialogTitle, DialogContent, DialogActions, 
    Button, TextField, Grid, InputAdornment, Typography 
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import { useRouteContext } from '../../context/RouteContext';
import { useMapContext } from '../../context/MapContext';

export const EmbedDialog = ({ open, onClose }) => {
    const { routes, currentRoute } = useRouteContext();
    const { map } = useMapContext();
    const [copied, setCopied] = useState(false);
    const [embedSize, setEmbedSize] = useState({ width: 800, height: 600 });
    
    // Get current map state
    const mapState = map ? {
        center: [map.getCenter().lng, map.getCenter().lat],
        zoom: map.getZoom(),
        bearing: map.getBearing(),
        pitch: map.getPitch(),
        style: map.getStyle()?.name || 'satellite'
    } : null;
    
    // Generate a state ID for the current map state
    const stateId = useMemo(() => {
        if (!routes.length) return '';
        
        // Create a hash of the current routes and map state
        const routeData = routes.map(r => ({
            id: r.id || r.routeId,
            visible: true // We'll show all routes in the embed
        }));
        
        return btoa(JSON.stringify({
            routes: routeData,
            mapState
        }));
    }, [routes, mapState]);
    
    // Generate embed code
    const embedCode = `<iframe 
  src="${window.location.origin}/embed/${stateId}" 
  width="${embedSize.width}" 
  height="${embedSize.height}" 
  style="border:0;" 
  allowfullscreen="" 
  loading="lazy">
</iframe>`;

    // Copy to clipboard functionality
    const handleCopy = () => {
        navigator.clipboard.writeText(embedCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    
    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>Embed Map</DialogTitle>
            <DialogContent>
                <Typography variant="body2" sx={{ mb: 2 }}>
                    Embed the current map view with all visible routes in your website.
                </Typography>
                
                {/* Size controls */}
                <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={6}>
                        <TextField
                            label="Width"
                            type="number"
                            value={embedSize.width}
                            onChange={(e) => setEmbedSize({...embedSize, width: e.target.value})}
                            InputProps={{
                                endAdornment: <InputAdornment position="end">px</InputAdornment>,
                            }}
                        />
                    </Grid>
                    <Grid item xs={6}>
                        <TextField
                            label="Height"
                            type="number"
                            value={embedSize.height}
                            onChange={(e) => setEmbedSize({...embedSize, height: e.target.value})}
                            InputProps={{
                                endAdornment: <InputAdornment position="end">px</InputAdornment>,
                            }}
                        />
                    </Grid>
                </Grid>
                
                {/* Embed code display */}
                <TextField
                    label="Embed Code"
                    multiline
                    rows={4}
                    fullWidth
                    value={embedCode}
                    InputProps={{
                        readOnly: true,
                    }}
                />
            </DialogContent>
            <DialogActions>
                <Button 
                    onClick={handleCopy}
                    startIcon={copied ? <CheckIcon /> : <ContentCopyIcon />}
                    color={copied ? "success" : "primary"}
                >
                    {copied ? "Copied!" : "Copy Code"}
                </Button>
                <Button onClick={onClose}>Close</Button>
            </DialogActions>
        </Dialog>
    );
};
