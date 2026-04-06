import React, { useState } from 'react';
import { View, TextInput, Button, StyleSheet, Text, Alert } from 'react-native';
import { initGitHub } from '../services/github';

export const LoginScreen = ({ navigation }: any) => {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!token.trim()) {
      Alert.alert('Error', 'Please enter a GitHub token');
      return;
    }
    setLoading(true);
    try {
      await initGitHub(token.trim());
      navigation.replace('RepoBrowser');
    } catch (error) {
      Alert.alert('Error', 'Invalid token or network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Workbench Mobile</Text>
      <Text style={styles.subtitle}>Enter your GitHub Personal Access Token</Text>
      <TextInput
        style={styles.input}
        placeholder="ghp_xxxxxxxxxxxx"
        value={token}
        onChangeText={setToken}
        secureTextEntry
        autoCapitalize="none"
      />
      <Button title={loading ? 'Connecting...' : 'Connect'} onPress={handleLogin} disabled={loading} />
      <Text style={styles.hint}>
        Create a token at:{'\n'}github.com/settings/tokens
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center', backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 20, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 16 },
  hint: { marginTop: 20, textAlign: 'center', color: '#999', fontSize: 12 },
});
