import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, Text, Alert } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { getFileContent } from '../services/github';

export const FileViewerScreen = ({ navigation, route }: any) => {
  const { owner, repo, path } = route.params;
  const [content, setContent] = useState('');
  const [sha, setSha] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFile();
  }, []);

  const loadFile = async () => {
    try {
      const { content: fileContent, sha: fileSha } = await getFileContent(owner, repo, path);
      setContent(fileContent);
      setSha(fileSha);
    } catch (error) {
      Alert.alert('Error', 'Failed to load file');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    navigation.navigate('Editor', { owner, repo, path, content, sha });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.filename} numberOfLines={1}>{path}</Text>
        <TouchableOpacity style={styles.editBtn} onPress={handleEdit}>
          <Text style={styles.editText}>✏️ Edit</Text>
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.content}>
        <Markdown>{content}</Markdown>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  filename: { fontSize: 16, fontWeight: 'bold', flex: 1, marginRight: 12 },
  editBtn: { backgroundColor: '#2196f3', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 4 },
  editText: { color: '#fff', fontWeight: 'bold' },
  content: { flex: 1, padding: 16 },
});
