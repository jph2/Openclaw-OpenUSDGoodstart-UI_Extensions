import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { LoginScreen } from './src/screens/LoginScreen';
import { RepoBrowserScreen } from './src/screens/RepoBrowserScreen';
import { FileViewerScreen } from './src/screens/FileViewerScreen';
import { EditorScreen } from './src/screens/EditorScreen';

export type RootStackParamList = {
  Login: undefined;
  RepoBrowser: { owner?: string; repo?: string; path?: string };
  FileViewer: { owner: string; repo: string; path: string; content: string; sha: string };
  Editor: { owner: string; repo: string; path: string; content: string; sha: string };
};

const Stack = createStackNavigator<RootStackParamList>();

export default function App() {
  const [initialRoute, setInitialRoute] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = await AsyncStorage.getItem('github_token');
    setInitialRoute(token ? 'RepoBrowser' : 'Login');
  };

  if (!initialRoute) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={initialRoute as any}>
        <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Workbench Mobile' }} />
        <Stack.Screen name="RepoBrowser" component={RepoBrowserScreen} options={{ title: 'Repositories' }} />
        <Stack.Screen name="FileViewer" component={FileViewerScreen} options={{ title: 'View File' }} />
        <Stack.Screen name="Editor" component={EditorScreen} options={{ title: 'Edit File' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
