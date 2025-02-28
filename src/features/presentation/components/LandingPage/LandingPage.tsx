import React, { useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';
import { PublicRouteMetadata } from '../../types/route.types';
import { publicRouteService } from '../../services/publicRoute.service.js';
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
import TerrainIcon from '@mui/icons-material/Terrain';
import StraightenIcon from '@mui/icons-material/Straighten';
import { styled } from '@mui/material/styles';
import { getStartingLocation } from '../../utils/locationUtils';

interface LocationDisplayProps {
  geojson: any;
}

const LocationDisplay: React.FC<LocationDisplayProps> = ({ geojson }) => {
  const [location, setLocation] = useState({ state: 'AUSTRALIA', city: 'UNKNOWN' });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLocation = async () => {
      try {
        setIsLoading(true);
        const result = await getStartingLocation(geojson);
        setLocation({ state: `AUSTRALIA, ${result.state}`, city: result.city });
      } catch (error) {
        console.error('Error fetching location:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLocation();
  }, [geojson]);

  if (isLoading) {
    return (
      <>
        <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'Montserrat' }}>
          AUSTRALIA
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'Montserrat' }}>
          Loading location...
        </Typography>
      </>
    );
  }

  return (
    <>
      <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'Montserrat' }}>
        {location.state}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'Montserrat' }}>
        {location.city}
      </Typography>
    </>
  );
};

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

const calculateTotalDistance = (routes: any[]) => {
  return Math.round(routes
    .filter(r => r.statistics?.totalDistance)
    .reduce((total, r) => total + r.statistics.totalDistance, 0) / 1000)
    .toLocaleString();
};

const calculateTotalElevation = (routes: any[]) => {
  return Math.round(routes
    .filter(r => r.statistics?.elevationGain)
    .reduce((total, r) => total + r.statistics.elevationGain, 0))
    .toLocaleString();
};

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { loginWithRedirect } = useAuth0();
  const [featuredRoutes, setFeaturedRoutes] = useState<PublicRouteMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const featuredRoutesRef = React.useRef<HTMLDivElement>(null);

  const scrollToFeaturedRoutes = () => {
    featuredRoutesRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

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
    <Box sx={{ 
      minHeight: '100vh',
      width: '100vw',
      overflow: 'hidden',
      position: 'relative'
    }}>
      {/* Hero Section with Background Image */}
      <Box
        sx={{
          position: 'relative',
          height: '100vh',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: 'url(../../../../docs/hero.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'brightness(0.35)',
            zIndex: 0
          }}
        />
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <Box textAlign="center">
            <Typography 
              variant="h2" 
              component="h1" 
              gutterBottom
              sx={{ 
                fontFamily: 'Montserrat',
                fontWeight: 'bold',
                mb: 3,
                fontSize: { xs: '2.5rem', md: '3.75rem' },
                color: 'white',
                textShadow: '2px 2px 8px rgba(0, 0, 0, 0.8)'
              }}
            >
              Create Beautiful Maps
            </Typography>
            <Typography 
              variant="h5" 
              sx={{ 
                fontFamily: 'Montserrat',
                maxWidth: 'md',
                mx: 'auto',
                mb: 4,
                color: 'white',
                textShadow: '1px 1px 4px rgba(0, 0, 0, 0.8)'
              }}
            >
              Create & share beautiful cycling, hiking or tourism maps with 3d terrain, points of interest, photos and much more..
            </Typography>
            <Stack spacing={3} alignItems="center">
              <Button 
                variant="outlined"
                size="large"
                sx={{ 
                  px: 6, 
                  py: 2.5,
                  fontSize: '1.2rem',
                  fontFamily: 'Montserrat',
                  minWidth: '320px',
                  height: '64px',
                  color: 'white',
                  borderColor: 'white',
                  borderWidth: 2,
                  bgcolor: 'transparent',
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.05)',
                    borderColor: 'white',
                    borderWidth: 2
                  }
                }}
                onClick={() => navigate('/editor')}
              >
                CREATE A MAP
              </Button>
              <Button 
                variant="outlined"
                size="large"
                onClick={scrollToFeaturedRoutes}
                sx={{ 
                  px: 6, 
                  py: 2.5,
                  fontSize: '1.2rem',
                  fontFamily: 'Montserrat',
                  minWidth: '320px',
                  height: '100px',
                  color: 'white',
                  borderColor: 'white',
                  borderWidth: 2,
                  bgcolor: 'transparent',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 1,
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.05)',
                    borderColor: 'white',
                    borderWidth: 2
                  }
                }}
              >
                Featured Routes
                <i className="fa-sharp fa-solid fa-circle-chevron-down" style={{ fontSize: '2rem', color: 'white' }} />
              </Button>
            </Stack>
          </Box>
        </Container>
      </Box>

      {/* Featured Routes Section */}
      <Box 
        ref={featuredRoutesRef} 
        sx={{ 
          py: 8, 
          bgcolor: 'background.default',
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: 'url(/images/contour.jpeg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'invert(1)',
            opacity: 0.08,
            zIndex: 0
          }
        }}
      >
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <Typography 
            variant="h2" 
            component="h2" 
            textAlign="center" 
            gutterBottom
            sx={{ 
              fontFamily: 'Montserrat',
              mb: 6,
              color: 'white',
              fontWeight: 'bold',
              fontSize: { xs: '2.5rem', md: '3.75rem' },
              textShadow: '2px 2px 8px rgba(0, 0, 0, 0.8)'
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
                    onClick={() => navigate(`/preview/route/${route.persistentId}`)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <MapPreviewWrapper>
                      <MapPreview
                        center={route.mapState.center}
                        zoom={route.mapState.zoom}
                        routes={route.routes}
                      />
                    </MapPreviewWrapper>
                    <CardContent>
                      <Typography variant="h6" gutterBottom sx={{ fontFamily: 'Montserrat' }}>
                        {route.name}
                      </Typography>
                      <Stack spacing={1} sx={{ mt: 1 }}>
                        <LocationDisplay geojson={route.routes[0].geojson} />
                        <Stack direction="row" spacing={1} alignItems="center">
                          <StraightenIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                          <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'Montserrat' }}>
                            {calculateTotalDistance(route.routes)}km
                          </Typography>
                        </Stack>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <TerrainIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                          <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'Montserrat' }}>
                            {calculateTotalElevation(route.routes)}m
                          </Typography>
                        </Stack>
                      </Stack>
                      <Stack spacing={1} sx={{ mt: 2 }}>
                        <Stack
                          direction="row"
                          spacing={1}
                          alignItems="center"
                          divider={<Typography color="text.secondary" sx={{ fontFamily: 'Montserrat' }}>•</Typography>}
                        >
                          <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'Montserrat' }}>
                            {route.viewCount} views
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'Montserrat' }}>
                            {new Date(route.createdAt).toLocaleDateString()}
                          </Typography>
                        </Stack>
                        <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'Montserrat' }}>
                          {route.type.charAt(0).toUpperCase() + route.type.slice(1)}
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
