import React from 'react';
import { View, StyleSheet, ScrollView, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { 
  Text, 
  Card, 
  Title, 
  Paragraph, 
  Button, 
  Switch, 
  Divider,
  Avatar,
  List,
  useTheme as usePaperTheme 
} from 'react-native-paper';
import { useTheme } from '../theme';

// Mock user data for initial development
const MOCK_USER = {
  id: 'user123',
  name: 'Jane Smith',
  email: 'jane.smith@example.com',
  isPremium: false,
  joinedDate: '2025-01-15T10:30:00Z',
  avatar: null, // We'll use a placeholder for now
};

const ProfileScreen = ({ navigation }: any) => {
  const [isLoggedIn, setIsLoggedIn] = React.useState(true);
  const { isDark, toggleTheme } = useTheme();
  const paperTheme = usePaperTheme();
  
  const [settings, setSettings] = React.useState({
    offlineMapQuality: 'standard', // 'low', 'standard', 'high'
    downloadOverCellular: false,
    notifications: true,
  });
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-AU', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };
  
  const toggleSetting = (setting: keyof typeof settings) => {
    setSettings(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
  };
  
  const handleLogout = () => {
    // In a real app, we would call an authentication service
    setIsLoggedIn(false);
  };
  
  const handleLogin = () => {
    // In a real app, we would navigate to a login screen
    setIsLoggedIn(true);
  };

  return (
    <View style={[styles.container, { backgroundColor: paperTheme.colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <ScrollView>
        <Text style={[styles.title, { color: paperTheme.colors.onBackground }]}>
          Profile
        </Text>
        
        {isLoggedIn ? (
          <Card style={styles.profileSection} elevation={0}>
            <Card.Content style={styles.profileContent}>
              {MOCK_USER.avatar ? (
                <Avatar.Image size={80} source={{ uri: MOCK_USER.avatar }} />
              ) : (
                <Avatar.Text size={80} label={MOCK_USER.name.charAt(0)} />
              )}
              
              <Title style={styles.userName}>{MOCK_USER.name}</Title>
              <Paragraph style={styles.userEmail}>{MOCK_USER.email}</Paragraph>
              <Text style={styles.userJoinDate}>Member since {formatDate(MOCK_USER.joinedDate)}</Text>
              
              {MOCK_USER.isPremium ? (
                <Button 
                  mode="contained" 
                  style={styles.premiumBadge}
                  labelStyle={{ color: '#ffffff' }}
                  disabled
                >
                  Premium Member
                </Button>
              ) : (
                <Button 
                  mode="outlined" 
                  style={styles.upgradeToPremiumButton}
                  icon="star"
                  onPress={() => console.log('Upgrade to premium')}
                >
                  Upgrade to Premium
                </Button>
              )}
            </Card.Content>
          </Card>
        ) : (
          <Card style={styles.loginPrompt} elevation={0}>
            <Card.Content style={styles.loginPromptContent}>
              <Paragraph style={styles.loginPromptText}>
                Sign in to access your profile, saved maps, and premium content.
              </Paragraph>
              <Button 
                mode="contained" 
                style={styles.loginButton}
                onPress={handleLogin}
              >
                Sign In
              </Button>
            </Card.Content>
          </Card>
        )}
        
        <Card style={styles.settingsSection} elevation={0}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Settings</Title>
            <Divider style={styles.divider} />
            
            <List.Item
              title="Map Quality"
              right={() => (
                <View style={styles.qualitySelector}>
                  <Button 
                    mode={settings.offlineMapQuality === 'low' ? 'contained' : 'outlined'}
                    compact
                    style={styles.qualityOption}
                    onPress={() => setSettings(prev => ({ ...prev, offlineMapQuality: 'low' }))}
                  >
                    Low
                  </Button>
                  <Button 
                    mode={settings.offlineMapQuality === 'standard' ? 'contained' : 'outlined'}
                    compact
                    style={styles.qualityOption}
                    onPress={() => setSettings(prev => ({ ...prev, offlineMapQuality: 'standard' }))}
                  >
                    Standard
                  </Button>
                  <Button 
                    mode={settings.offlineMapQuality === 'high' ? 'contained' : 'outlined'}
                    compact
                    style={styles.qualityOption}
                    onPress={() => setSettings(prev => ({ ...prev, offlineMapQuality: 'high' }))}
                  >
                    High
                  </Button>
                </View>
              )}
            />
            
            <List.Item
              title="Download Over Cellular"
              right={() => (
                <Switch
                  value={settings.downloadOverCellular}
                  onValueChange={() => toggleSetting('downloadOverCellular')}
                  color={paperTheme.colors.primary}
                />
              )}
            />
            
            <List.Item
              title="Dark Mode"
              right={() => (
                <Switch
                  value={isDark}
                  onValueChange={toggleTheme}
                  color={paperTheme.colors.primary}
                />
              )}
            />
            
            <List.Item
              title="Notifications"
              right={() => (
                <Switch
                  value={settings.notifications}
                  onValueChange={() => toggleSetting('notifications')}
                  color={paperTheme.colors.primary}
                />
              )}
            />
          </Card.Content>
        </Card>
        
        <Card style={styles.aboutSection} elevation={0}>
          <Card.Content>
            <Title style={styles.sectionTitle}>About</Title>
            <Divider style={styles.divider} />
            
            <List.Item
              title="Privacy Policy"
              right={props => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => console.log('Privacy Policy')}
            />
            <List.Item
              title="Terms of Service"
              right={props => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => console.log('Terms of Service')}
            />
            <List.Item
              title="Contact Support"
              right={props => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => console.log('Contact Support')}
            />
            
            <Text style={styles.versionText}>Version 1.0.0</Text>
          </Card.Content>
        </Card>
        
        {isLoggedIn && (
          <Button 
            mode="outlined" 
            icon="logout" 
            style={styles.logoutButton}
            color={paperTheme.colors.error}
            onPress={handleLogout}
          >
            Log Out
          </Button>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    marginTop: 40,
  },
  profileSection: {
    marginBottom: 16,
  },
  profileContent: {
    alignItems: 'center',
  },
  userName: {
    marginTop: 8,
    textAlign: 'center',
  },
  userEmail: {
    textAlign: 'center',
  },
  userJoinDate: {
    fontSize: 12,
    opacity: 0.6,
    marginBottom: 16,
    textAlign: 'center',
  },
  premiumBadge: {
    backgroundColor: '#ee5253',
    marginTop: 8,
  },
  upgradeToPremiumButton: {
    marginTop: 8,
    borderColor: '#ee5253',
  },
  loginPrompt: {
    marginBottom: 16,
  },
  loginPromptContent: {
    alignItems: 'center',
  },
  loginPromptText: {
    textAlign: 'center',
    marginBottom: 16,
  },
  loginButton: {
    marginTop: 8,
  },
  settingsSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 4,
  },
  divider: {
    marginBottom: 8,
  },
  qualitySelector: {
    flexDirection: 'row',
  },
  qualityOption: {
    marginLeft: 4,
  },
  aboutSection: {
    marginBottom: 16,
  },
  versionText: {
    fontSize: 14,
    opacity: 0.6,
    marginTop: 12,
    textAlign: 'center',
  },
  logoutButton: {
    marginBottom: 32,
  },
});

export default ProfileScreen;
