import React, { useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';
import { PublicRouteMetadata } from '../../types/route.types';
import { publicRouteService } from '../../services/publicRoute.service';
import { MapPreview } from '../MapPreview/MapPreview';
import { 
  Container,
  Typography,
  Box,
  Button,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Stack,
  Divider
} from '@mui/material';
import { styled } from '@mui/material/styles';

const StyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  transition: 'transform 0.2s ease-in-out',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[4]
  }
}));

const MapPreviewWrapper = styled(Box)({
  position: 'relative',
  paddingTop: '56.25%', // 16:9 aspect ratio
  '& > *': {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%'
  }
});

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { loginWithRedirect } = useAuth0();
  const [featuredRoutes, setFeaturedRoutes] = useState<PublicRouteMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFeaturedRoutes = async () => {
      try {
        setLoading(true);
        setError(null);
        const routes = await publicRouteService.listRoutes();
        setFeaturedRoutes(routes.slice(0, 3));
      } catch (error) {
        setError('Failed to load featured routes');
        console.error('Error fetching featured routes:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFeaturedRoutes();
  }, []);

  return (
    <Box sx={{ minHeight: '100vh' }}>
      {/* Hero Section with Background Image */}
      <Box
        sx={{
          position: 'relative',
          height: '55vh',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: 'url(/images/hero-background.jpeg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'brightness(0.35)', // Darker tint
            zIndex: -1
          }
        }}
      >
        <Container maxWidth="lg">
          <Box textAlign="center">
            <Typography 
              variant="h2" 
              component="h1" 
              gutterBottom
              sx={{ 
                fontWeight: 'bold',
                mb: 3,
                fontSize: { xs: '2.5rem', md: '3.75rem' },
                color: 'white',
                textShadow: '2px 2px 4px rgba(0, 0, 0, 0.5)'
              }}
            >
              Create Beautiful Maps
            </Typography>
            <Typography 
              variant="h5" 
              sx={{ 
                maxWidth: 'md',
                mx: 'auto',
                mb: 4,
                color: 'white',
                textShadow: '1px 1px 2px rgba(0, 0, 0, 0.5)'
              }}
            >
              Create & share beautiful cycling, hiking or tourism maps with 3d terrain, points of interest, photos and much more..
            </Typography>
            <Button 
              variant="contained" 
              size="large"
              sx={{ 
                px: 6, 
                py: 2,
                fontSize: '1.2rem'
              }}
              onClick={() => loginWithRedirect()}
            >
              Start Creating
            </Button>
          </Box>
        </Container>
      </Box>

      {/* Featured Routes Section */}
      <Box sx={{ py: 8, bgcolor: 'background.default' }}>
        <Container maxWidth="lg">
          <Typography 
            variant="h3" 
            component="h2" 
            textAlign="center" 
            gutterBottom
            sx={{ 
              mb: 6,
              color: 'white'
            }}
          >
            Featured Routes
          </Typography>
          {loading ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error" sx={{ maxWidth: 'sm', mx: 'auto' }}>
              {error}
            </Alert>
          ) : (
            <Grid container spacing={4}>
              {featuredRoutes.map((route) => (
                  <Grid item xs={12} sm={6} md={4} key={route.id}>
                    <StyledCard 
                      onClick={() => navigate(`/preview/route/${route.id}`)}
                      sx={{ cursor: 'pointer' }}
                    >
                    <MapPreviewWrapper>
                      <MapPreview
                        center={route.mapState.center}
                        zoom={route.mapState.zoom}
                        geojson={route.routes[0]?.geojson}
                      />
                    </MapPreviewWrapper>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        {route.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {route.type.charAt(0).toUpperCase() + route.type.slice(1)}
                      </Typography>
                      <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        sx={{ mt: 1 }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          {route.viewCount} views
                        </Typography>
                        <Typography variant="body2" color="text.secondary">•</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {new Date(route.createdAt).toLocaleDateString()}
                        </Typography>
                      </Stack>
                    </CardContent>
                  </StyledCard>
                </Grid>
              ))}
            </Grid>
          )}
        </Container>
      </Box>
    </Box>
  );
};
