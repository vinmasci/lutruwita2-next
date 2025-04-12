import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { 
  Text, 
  Card, 
  Title, 
  Paragraph, 
  Button, 
  ProgressBar,
  IconButton,
  useTheme as usePaperTheme 
} from 'react-native-paper';
import { useTheme } from '../theme';

// Mock data for initial development
const MOCK_DOWNLOADED_MAPS = [
  { 
    id: '2', 
    name: 'Freycinet Peninsula', 
    description: 'Coastal peninsula with stunning beaches', 
    downloadedAt: '2025-04-10T14:30:00Z',
    size: 45.8, // MB
  },
  { 
    id: '3', 
    name: 'Mount Wellington', 
    description: 'Mountain overlooking Hobart', 
    downloadedAt: '2025-04-08T09:15:00Z',
    size: 32.1, // MB
  },
];

const DownloadsScreen = ({ navigation }: any) => {
  const { isDark } = useTheme();
  const paperTheme = usePaperTheme();
  const [totalStorage, setTotalStorage] = React.useState(77.9); // MB
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-AU', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };
  
  const renderDownloadItem = ({ item }: any) => (
    <Card 
      style={styles.downloadItem}
      elevation={0}
      onPress={() => navigation.navigate('Map', { mapId: item.id })}
    >
      <Card.Content>
        <Title>{item.name}</Title>
        <Paragraph>{item.description}</Paragraph>
        <View style={styles.downloadDetails}>
          <Text style={styles.downloadDate}>Downloaded: {formatDate(item.downloadedAt)}</Text>
          <Text style={styles.downloadSize}>{item.size.toFixed(1)} MB</Text>
        </View>
        <Button 
          mode="outlined" 
          icon="delete" 
          color={paperTheme.colors.error}
          style={styles.deleteButton}
          onPress={() => console.log(`Delete map ${item.id}`)}
        >
          Delete
        </Button>
      </Card.Content>
    </Card>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Title style={styles.emptyStateTitle}>No Downloads Yet</Title>
      <Paragraph style={styles.emptyStateDescription}>
        Maps you download for offline use will appear here.
      </Paragraph>
      <Button 
        mode="contained" 
        icon="compass" 
        style={styles.browseButton}
        onPress={() => navigation.navigate('Home')}
      >
        Browse Maps
      </Button>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: paperTheme.colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Text style={[styles.title, { color: paperTheme.colors.onBackground }]}>
        Downloaded Maps
      </Text>
      
      <Card style={styles.storageContainer} elevation={0}>
        <Card.Content>
          <Title style={styles.storageTitle}>Storage Used</Title>
          <ProgressBar 
            progress={Math.min(1, totalStorage / 500)} 
            color={paperTheme.colors.primary}
            style={styles.storageBar}
          />
          <Text style={styles.storageText}>{totalStorage.toFixed(1)} MB of 500 MB</Text>
        </Card.Content>
      </Card>
      
      <FlatList
        data={MOCK_DOWNLOADED_MAPS}
        renderItem={renderDownloadItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState}
      />
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
  storageContainer: {
    marginBottom: 16,
  },
  storageTitle: {
    marginBottom: 8,
  },
  storageBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  storageText: {
    fontSize: 14,
    opacity: 0.7,
  },
  listContent: {
    paddingBottom: 16,
    flexGrow: 1,
  },
  downloadItem: {
    marginBottom: 12,
    borderRadius: 8,
  },
  downloadDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 8,
  },
  downloadDate: {
    fontSize: 12,
    opacity: 0.7,
  },
  downloadSize: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  deleteButton: {
    marginTop: 8,
    alignSelf: 'flex-end',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyStateTitle: {
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateDescription: {
    textAlign: 'center',
    marginBottom: 24,
    opacity: 0.7,
  },
  browseButton: {
    paddingHorizontal: 16,
  },
});

export default DownloadsScreen;
