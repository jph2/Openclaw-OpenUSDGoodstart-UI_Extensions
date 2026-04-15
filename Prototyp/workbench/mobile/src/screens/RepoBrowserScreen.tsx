import React, { useState, useEffect } from 'react';
import { View, FlatList, TouchableOpacity, Text, StyleSheet, RefreshControl, Alert } from 'react-native';
import { getRepos, getRepoContent, QUICK_REPOS, logout } from '../services/github';

interface FileItem {
  name: string;
  path: string;
  type: 'file' | 'dir';
  sha: string;
}

export const RepoBrowserScreen = ({ navigation, route }: any) => {
  const [items, setItems] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPath, setCurrentPath] = useState('');
  
  const owner = route.params?.owner;
  const repo = route.params?.repo;

  useEffect(() => {
    if (owner && repo) {
      loadContent(owner, repo, currentPath);
    } else {
      loadQuickRepos();
    }
  }, [owner, repo, currentPath]);

  const loadQuickRepos = () => {
    const repos = QUICK_REPOS.map(r => ({
      name: r.name,
      path: '',
      type: 'dir' as const,
      sha: '',
      owner: r.owner,
      repo: r.repo,
    }));
    setItems(repos);
  };

  const loadContent = async (o: string, r: string, path: string) => {
    setLoading(true);
    try {
      const data = await getRepoContent(o, r, path);
      if (Array.isArray(data)) {
        const sorted = data
          .map(item => ({ name: item.name, path: item.path, type: item.type as 'file' | 'dir', sha: item.sha }))
          .sort((a, b) => (a.type === 'dir' ? -1 : 1) - (b.type === 'dir' ? -1 : 1));
        setItems(sorted);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load content');
    } finally {
      setLoading(false);
    }
  };

  const handleItemPress = (item: any) => {
    if (item.owner && item.repo) {
      navigation.push('RepoBrowser', { owner: item.owner, repo: item.repo });
    } else if (item.type === 'dir') {
      navigation.push('RepoBrowser', { owner, repo, path: item.path });
    } else if (item.name.endsWith('.md')) {
      navigation.navigate('FileViewer', { owner, repo, path: item.path });
    } else {
      Alert.alert('Info', 'Only Markdown files can be viewed');
    }
  };

  const handleLogout = () => {
    logout();
    navigation.replace('Login');
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.item} onPress={() => handleItemPress(item)}>
      <Text style={styles.icon}>{item.type === 'dir' ? '📁' : '📄'}</Text>
      <Text style={styles.name}>{item.name}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {owner && repo && (
        <View style={styles.header}>
          <Text style={styles.breadcrumb}>{owner}/{repo}</Text>
          {currentPath && <Text style={styles.path}>{currentPath}</Text>}
        </View>
      )}
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.path + item.name}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => owner && repo && loadContent(owner, repo, currentPath)} />}
      />
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  breadcrumb: { fontSize: 18, fontWeight: 'bold' },
  path: { fontSize: 14, color: '#666', marginTop: 4 },
  item: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  icon: { fontSize: 20, marginRight: 12 },
  name: { fontSize: 16 },
  logoutBtn: { padding: 16, backgroundColor: '#f5f5f5', alignItems: 'center' },
  logoutText: { color: '#d32f2f', fontWeight: 'bold' },
});
