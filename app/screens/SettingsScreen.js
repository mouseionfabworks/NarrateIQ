import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Linking,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../utils/supabaseClient';
import { colors } from '../constants/theme';

const OUTPUT_MODE_KEY = 'narrateiq_default_output_mode';
const APP_VERSION = '0.1.0-alpha';

export default function SettingsScreen({ navigation }) {
  const [userEmail, setUserEmail] = useState('');
  const [isNarrativeMode, setIsNarrativeMode] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) {
        setUserEmail(session.user.email);
      }
      const saved = await AsyncStorage.getItem(OUTPUT_MODE_KEY);
      if (saved !== null) {
        setIsNarrativeMode(saved === 'Narrative');
      }
    }
    loadSettings();
  }, []);

  async function handleToggleOutputMode(value) {
    setIsNarrativeMode(value);
    const mode = value ? 'Narrative' : 'Outline';
    await AsyncStorage.setItem(OUTPUT_MODE_KEY, mode);
  }

  async function handleSignOut() {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            setSigningOut(true);
            const { error } = await supabase.auth.signOut();
            if (error) {
              Alert.alert('Error', 'Sign out failed. Please try again.');
              setSigningOut(false);
            }
          },
        },
      ]
    );
  }

  function handleFeedback() {
    Linking.openURL('mailto:jason@mouseionfabworks.com?subject=NarrateIQ%20Beta%20Feedback');
  }

  const outputModeLabel = isNarrativeMode ? 'Narrative' : 'Outline';

  return (
    <View style={styles.container}>

      {/* Account */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Account</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Email</Text>
          <Text style={styles.rowValue} numberOfLines={1}>{userEmail || '—'}</Text>
        </View>
      </View>

      {/* Preferences */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Preferences</Text>
        <View style={styles.row}>
          <View style={styles.rowLabelGroup}>
            <Text style={styles.rowLabel}>Default Output Mode</Text>
            <Text style={styles.rowSubLabel}>{outputModeLabel}</Text>
          </View>
          <Switch
            value={isNarrativeMode}
            onValueChange={handleToggleOutputMode}
            trackColor={{ false: colors.bgInputBorder, true: colors.accent }}
            thumbColor={colors.textPrimary}
            ios_backgroundColor={colors.bgInputBorder}
          />
        </View>
      </View>

      {/* Support */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Support</Text>
        <TouchableOpacity style={styles.row} onPress={handleFeedback}>
          <Text style={styles.rowLabel}>Send Feedback</Text>
          <Text style={styles.rowChevron}>›</Text>
        </TouchableOpacity>
      </View>

      {/* About */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>About</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Version</Text>
          <Text style={styles.rowValue}>{APP_VERSION}</Text>
        </View>
      </View>

      {/* Sign Out */}
      <TouchableOpacity
        style={[styles.signOutButton, signingOut && styles.signOutButtonDisabled]}
        onPress={handleSignOut}
        disabled={signingOut}
        activeOpacity={0.8}
      >
        <Text style={styles.signOutText}>
          {signingOut ? 'Signing Out...' : 'Sign Out'}
        </Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
    paddingTop: 24,
  },
  section: {
    backgroundColor: colors.bgCard,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rowLabelGroup: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 15,
    color: colors.textPrimary,
  },
  rowSubLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  rowValue: {
    fontSize: 14,
    color: colors.textSecondary,
    maxWidth: '60%',
    textAlign: 'right',
  },
  rowChevron: {
    fontSize: 22,
    color: colors.textSecondary,
  },
  signOutButton: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  signOutButtonDisabled: {
    opacity: 0.4,
  },
  signOutText: {
    fontSize: 15,
    color: colors.error,
    fontWeight: '600',
  },
});
