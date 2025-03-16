import { useState, useMemo, useEffect } from 'react';
import { 
    Dialog, DialogTitle, DialogContent, DialogActions, 
    Button, TextField, Grid, InputAdornment, Typography,
    Select, MenuItem, FormControl, InputLabel
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import { useRouteContext } from '../../context/RouteContext';
import { useMapContext } from '../../context/MapContext';

export const EmbedDialog = ({ open, onClose }) => {
    const { routes, currentRoute } = useRouteContext();
    const { map } = useMapContext();
    const [copied, setCopied] = useState(false);
    const [embedSize, setEmbedSize] = useState({ 
        width: 800, 
        height: 600,
        widthUnit: 'px',
        heightUnit: 'px'
    });
    
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
    
    // Update dimensions when unit changes
    useEffect(() => {
        // When switching to percentage, set width to 100%
        if (embedSize.widthUnit === '%') {
            setEmbedSize(prev => ({ ...prev, width: 100 }));
        }
        // When switching to percentage, set height to maintain aspect ratio or 100%
        if (embedSize.heightUnit === '%') {
            setEmbedSize(prev => ({ ...prev, height: 100 }));
        }
    }, [embedSize.widthUnit, embedSize.heightUnit]);
    
    // Generate embed code
    const embedCode = `<iframe 
  src="${window.location.origin}/embed/${stateId}" 
  width="${embedSize.width}${embedSize.widthUnit}" 
  height="${embedSize.height}${embedSize.heightUnit}" 
  style="border:0; border-radius:12px; overflow:hidden;" 
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
                    <Grid item xs={8}>
                        <TextField
                            label="Width"
                            type="number"
                            value={embedSize.width}
                            onChange={(e) => setEmbedSize({...embedSize, width: e.target.value})}
                            fullWidth
                        />
                    </Grid>
                    <Grid item xs={4}>
                        <FormControl fullWidth>
                            <InputLabel id="width-unit-label">Unit</InputLabel>
                            <Select
                                labelId="width-unit-label"
                                value={embedSize.widthUnit}
                                label="Unit"
                                onChange={(e) => setEmbedSize({...embedSize, widthUnit: e.target.value})}
                            >
                                <MenuItem value="px">px</MenuItem>
                                <MenuItem value="%">%</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={8}>
                        <TextField
                            label="Height"
                            type="number"
                            value={embedSize.height}
                            onChange={(e) => setEmbedSize({...embedSize, height: e.target.value})}
                            fullWidth
                        />
                    </Grid>
                    <Grid item xs={4}>
                        <FormControl fullWidth>
                            <InputLabel id="height-unit-label">Unit</InputLabel>
                            <Select
                                labelId="height-unit-label"
                                value={embedSize.heightUnit}
                                label="Unit"
                                onChange={(e) => setEmbedSize({...embedSize, heightUnit: e.target.value})}
                            >
                                <MenuItem value="px">px</MenuItem>
                                <MenuItem value="%">%</MenuItem>
                            </Select>
                        </FormControl>
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
