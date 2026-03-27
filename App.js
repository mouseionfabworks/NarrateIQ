import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './app/navigation/AppNavigator';

export default function App() {
  console.log('[App] Initializing NarrateIQ');
  return (
    <NavigationContainer>
      <AppNavigator />
    </NavigationContainer>
  );
}
