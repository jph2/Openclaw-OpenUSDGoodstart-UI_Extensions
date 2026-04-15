import React, { useState } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Text, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { updateFile } from '../services/github';

export const EditorScreen = ({ navigation, route }: any) => {
  const { owner, repo, path, content: initialContent, sha } = route.params;
  const [content, setContent] = useState(initialContent);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (content === initialContent) {
      Alert.alert('Info', 'No changes made');
      return;
    }
    setSaving(true);
    try {
      await updateFile(owner, repo, path, content, sha);
      Alert.alert('Success', 'File saved!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      if (error.status === 409) {
        Alert.alert('Conflict', 'File was modified by someone else. Please refresh and try again.');
      } else {
        Alert.alert('Error', 'Failed to save file');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <Text style={styles.filename} numberOfLines={1}>{path}</Text>
        <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={handleSave} disabled={saving}>
          <Text style={styles.saveText}>{saving ? 'Saving...' : '💾 Save'}</Text>
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.scrollView}>
        <TextInput
          style={styles.input}
          multiline
          value={content}
          onChangeText={setContent}
          autoCapitalize="none"
          autoCorrect={false}
          textAlignVertical="top"
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  filename: { fontSize: 16, fontWeight: 'bold', flex: 1, marginRight: 12 },
  saveBtn: { backgroundColor: '#4caf50', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 4 },
  saveBtnDisabled: { backgroundColor: '#ccc' },
  saveText: { color: '#fff', fontWeight: 'bold' },
  scrollView: { flex: 1 },
  input: { flex: 1, padding: 16, fontSize: 14, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', minHeight: 600 },
});
