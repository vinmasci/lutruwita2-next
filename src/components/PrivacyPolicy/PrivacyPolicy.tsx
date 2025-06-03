import React from 'react';
import { Container, Typography, Box, Link, Paper } from '@mui/material';

const PrivacyPolicy: React.FC = () => {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: '#f8f9fa',
        py: 4,
        px: 2
      }}
    >
      <Container maxWidth="md">
        <Paper
          sx={{
            p: 4,
            borderRadius: 2,
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
          }}
        >
          <Typography
            variant="h3"
            component="h1"
            gutterBottom
            sx={{
              color: '#2c5530',
              borderBottom: '3px solid #4a7c59',
              pb: 1,
              mb: 3
            }}
          >
            Privacy Policy for CYA Routes
          </Typography>
          
          <Typography
            variant="body1"
            sx={{
              fontStyle: 'italic',
              color: '#666',
              mb: 3
            }}
          >
            <strong>Last updated: January 2025</strong>
          </Typography>

          <Typography variant="h5" component="h2" gutterBottom sx={{ color: '#4a7c59', mt: 3, mb: 2 }}>
            Information We Collect
          </Typography>
          
          <Typography variant="body1" paragraph>
            <strong>Personal Information:</strong>
          </Typography>
          <Box component="ul" sx={{ mb: 2, pl: 3 }}>
            <li>Name and email address (through Auth0 authentication)</li>
            <li>Location data (precise location for navigation and trail tracking)</li>
            <li>Photos and content you choose to save or share</li>
          </Box>

          <Typography variant="body1" paragraph>
            <strong>Automatically Collected:</strong>
          </Typography>
          <Box component="ul" sx={{ mb: 2, pl: 3 }}>
            <li>Device information and identifiers</li>
            <li>App usage analytics</li>
            <li>Crash reports and performance data</li>
          </Box>

          <Typography variant="h5" component="h2" gutterBottom sx={{ color: '#4a7c59', mt: 3, mb: 2 }}>
            How We Use Your Information
          </Typography>
          <Box component="ul" sx={{ mb: 2, pl: 3 }}>
            <li><strong>App Functionality:</strong> Authentication, navigation, saving your routes and preferences</li>
            <li><strong>Analytics:</strong> Understanding app usage to improve features and performance</li>
            <li><strong>Location Services:</strong> Providing trail maps, navigation, and location-based recommendations</li>
          </Box>

          <Typography variant="h5" component="h2" gutterBottom sx={{ color: '#4a7c59', mt: 3, mb: 2 }}>
            Third-Party Services
          </Typography>
          <Typography variant="body1" paragraph>
            We use these services that may collect data:
          </Typography>
          <Box component="ul" sx={{ mb: 2, pl: 3 }}>
            <li><strong>Auth0:</strong> User authentication</li>
            <li><strong>Firebase:</strong> Analytics, crash reporting, data storage</li>
            <li><strong>Mapbox:</strong> Map services and navigation</li>
            <li><strong>Google Places:</strong> Location and place information</li>
          </Box>

          <Typography variant="h5" component="h2" gutterBottom sx={{ color: '#4a7c59', mt: 3, mb: 2 }}>
            Data Security
          </Typography>
          <Typography variant="body1" paragraph>
            Your personal information is stored securely and protected using industry-standard practices.
          </Typography>

          <Paper
            sx={{
              backgroundColor: '#f0f8f0',
              p: 3,
              borderRadius: 1,
              mt: 3
            }}
          >
            <Typography variant="h5" component="h2" gutterBottom sx={{ color: '#4a7c59' }}>
              Contact Us
            </Typography>
            <Typography variant="body1">
              For questions about this privacy policy, contact:<br />
              <Link href="mailto:vincentmasci@icloud.com" color="primary">
                vincentmasci@icloud.com
              </Link>
            </Typography>
          </Paper>

          <Box sx={{ textAlign: 'center', mt: 4, color: '#666', fontSize: '0.9em' }}>
            <Typography variant="body2">
              <strong>© 2025 Vincent Masci</strong>
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default PrivacyPolicy;