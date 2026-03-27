// app/screens/HomeScreen.js
// Ticket 013: language selector button added next to mode toggle.
// Tapping opens a modal with 8 language options including auto-detect.
// Selected language is passed to ReviewScreen as inputLanguage param.
// All other logic unchanged.

import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  StyleSheet,
  Modal,
  Pressable,
} from 'react-native';
import useVoiceCapture from '../hooks/useVoiceCapture';
import detectClaimType from '../utils/detectClaimType';
import { claimTypeMap } from '../constants/claimTypes';
import { colors } from '../constants/theme';

const OUTPUT_MODES = ['Narrative', 'Outline'];

const LANGUAGES = [
  { code: 'auto',  label: 'Auto-detect' },
  { code: 'en',    label: 'English' },
  { code: 'es',    label: 'Español' },
  { code: 'fr',    label: 'Français' },
  { code: 'pt',    label: 'Português' },
  { code: 'de',    label: 'Deutsch' },
  { code: 'zh',    label: '中文' },
  { code: 'tl',    label: 'Filipino' },
];

export default function HomeScreen({ navigation }) {
  const {
    isRecording,
    transcript,
    interimTranscript,
    startRecording,
    stopRecording,
    clearTranscript,
    error,
  } = useVoiceCapture();

  const [outputMode, setOutputMode] = useState('Narrative');
  const [inputLanguage, setInputLanguage] = useState(LANGUAGES[0]);
  const [langModalVisible, setLangModalVisible] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef(null);

  useEffect(() => {
    if (isRecording) {
      pulseLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.22, duration: 700, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        ])
      );
      pulseLoop.current.start();
    } else {
      if (pulseLoop.current) pulseLoop.current.stop();
      pulseAnim.setValue(1);
    }
  }, [isRecording]);

  const claimTypeId = transcript ? detectClaimType(transcript) : null;
  const claimLabel = claimTypeId ? (claimTypeMap[claimTypeId]?.label ?? claimTypeId) : null;
  const hasContent = transcript.length > 0 || interimTranscript.length > 0;

  function handleRecordToggle() {
    isRecording ? stopRecording() : startRecording();
  }

  function handleReviewNotes() {
    navigation.navigate('Review', { transcript, outputMode, inputLanguage: inputLanguage.code });
  }

  function handleSelectLanguage(lang) {
    setInputLanguage(lang);
    setLangModalVisible(false);
  }

  const langButtonLabel = inputLanguage.code === 'auto' ? '🌐' : `🌐 ${inputLanguage.label}`;

  return (
    <View style={styles.container}>

      {/* Top controls row — mode toggle + language button */}
      <View style={styles.controlsRow}>
        <View style={styles.modeRow}>
          {OUTPUT_MODES.map((mode) => (
            <TouchableOpacity
              key={mode}
              style={[styles.modeButton, outputMode === mode && styles.modeButtonActive]}
              onPress={() => setOutputMode(mode)}
              activeOpacity={0.75}
            >
              <Text style={[styles.modeButtonText, outputMode === mode && styles.modeButtonTextActive]}>
                {mode}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.langButton}
          onPress={() => setLangModalVisible(true)}
          activeOpacity={0.75}
        >
          <Text style={styles.langButtonText}>{langButtonLabel}</Text>
        </TouchableOpacity>
      </View>

      {/* Claim type indicator */}
      <View style={styles.claimTypePill}>
        <Text style={styles.claimTypeText}>
          {claimLabel ? `⬡  ${claimLabel}` : '⬡  Detecting...'}
        </Text>
      </View>

      {/* Record button */}
      <View style={styles.recordWrapper}>
        <Animated.View
          style={[
            styles.pulseRingOuter,
            {
              transform: [{ scale: pulseAnim }],
              opacity: isRecording ? 0.35 : 0,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.pulseRingInner,
            {
              transform: [{ scale: pulseAnim }],
              opacity: isRecording ? 0.6 : 0,
            },
          ]}
        />

        <TouchableOpacity
          style={[
            styles.recordButton,
            isRecording ? styles.recordButtonActive : styles.recordButtonIdle,
          ]}
          onPress={handleRecordToggle}
          activeOpacity={0.85}
        >
          <Text style={styles.recordIcon}>{isRecording ? '■' : '●'}</Text>
          <Text style={styles.recordLabel}>{isRecording ? 'Stop' : 'Record'}</Text>
        </TouchableOpacity>
      </View>

      {/* Recording status text */}
      <Text style={styles.recordStatus}>
        {isRecording ? 'Listening...' : 'Tap to begin'}
      </Text>

      {/* Error */}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {/* Transcript area */}
      <ScrollView
        style={styles.transcriptScroll}
        contentContainerStyle={styles.transcriptContent}
        showsVerticalScrollIndicator={false}
      >
        {hasContent ? (
          <>
            <Text style={styles.confirmedText}>{transcript}</Text>
            {interimTranscript ? (
              <Text style={styles.interimText}>{interimTranscript}</Text>
            ) : null}
          </>
        ) : (
          <Text style={styles.placeholderText}>
            Speak your field observations...{'\n'}NarrateIQ will handle the rest.
          </Text>
        )}
      </ScrollView>

      {/* Action buttons — only when there is content */}
      {transcript.length > 0 && (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.reviewButton}
            onPress={handleReviewNotes}
            activeOpacity={0.85}
          >
            <Text style={styles.reviewButtonText}>Review Notes →</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.clearButton}
            onPress={clearTranscript}
            activeOpacity={0.75}
          >
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Language selection modal */}
      <Modal
        visible={langModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setLangModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setLangModalVisible(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>

            <Text style={styles.modalTitle}>Input Language</Text>
            <Text style={styles.modalSubtitle}>Output is always English</Text>

            {LANGUAGES.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.langOption,
                  inputLanguage.code === lang.code && styles.langOptionActive,
                ]}
                onPress={() => handleSelectLanguage(lang)}
                activeOpacity={0.75}
              >
                <Text style={[
                  styles.langOptionText,
                  inputLanguage.code === lang.code && styles.langOptionTextActive,
                ]}>
                  {lang.label}
                </Text>
                {inputLanguage.code === lang.code && (
                  <Text style={styles.langCheckmark}>✓</Text>
                )}
              </TouchableOpacity>
            ))}

          </Pressable>
        </Pressable>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: colors.bgPrimary,
  },

  // Top controls row
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 18,
    width: '100%',
    justifyContent: 'center',
  },

  // Mode toggle
  modeRow: {
    flexDirection: 'row',
    backgroundColor: colors.bgCard,
    borderRadius: 8,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modeButton: {
    paddingVertical: 7,
    paddingHorizontal: 22,
    borderRadius: 6,
  },
  modeButtonActive: {
    backgroundColor: colors.accent,
  },
  modeButtonText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  modeButtonTextActive: {
    color: colors.textPrimary,
    fontWeight: '600',
  },

  // Language button
  langButton: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  langButtonText: {
    fontSize: 14,
    color: colors.textSecondary,
  },

  // Claim type pill
  claimTypePill: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 14,
    marginBottom: 28,
  },
  claimTypeText: {
    fontSize: 13,
    color: colors.textSecondary,
    letterSpacing: 0.3,
  },

  // Record button
  recordWrapper: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  pulseRingOuter: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.recordActive,
  },
  pulseRingInner: {
    position: 'absolute',
    width: 118,
    height: 118,
    borderRadius: 59,
    backgroundColor: colors.recordActive,
  },
  recordButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  recordButtonIdle: {
    backgroundColor: colors.accent,
    borderColor: colors.accentLight,
  },
  recordButtonActive: {
    backgroundColor: colors.recordActive,
    borderColor: '#ff6b6b',
  },
  recordIcon: {
    fontSize: 28,
    color: colors.textPrimary,
  },
  recordLabel: {
    fontSize: 12,
    color: colors.textPrimary,
    marginTop: 3,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  recordStatus: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 20,
    letterSpacing: 0.5,
  },

  // Error
  error: {
    color: colors.error,
    textAlign: 'center',
    marginBottom: 12,
    fontSize: 13,
  },

  // Transcript
  transcriptScroll: {
    flex: 1,
    width: '100%',
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    marginBottom: 16,
  },
  transcriptContent: {
    padding: 14,
    minHeight: 80,
  },
  confirmedText: {
    fontSize: 15,
    color: colors.textPrimary,
    lineHeight: 23,
  },
  interimText: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 23,
    fontStyle: 'italic',
  },
  placeholderText: {
    fontSize: 15,
    color: colors.textSecondary,
    fontStyle: 'italic',
    lineHeight: 23,
    opacity: 0.7,
  },

  // Action buttons
  actionRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
  },
  reviewButton: {
    flex: 1,
    backgroundColor: colors.accent,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  reviewButtonText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  clearButton: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  clearButtonText: {
    color: colors.textSecondary,
    fontSize: 15,
  },

  // Language modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  modalCard: {
    width: '100%',
    backgroundColor: colors.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingVertical: 20,
    paddingHorizontal: 0,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 14,
  },
  langOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  langOptionActive: {
    backgroundColor: 'rgba(37,99,235,0.12)',
  },
  langOptionText: {
    fontSize: 15,
    color: colors.textPrimary,
  },
  langOptionTextActive: {
    color: colors.accentLight,
    fontWeight: '600',
  },
  langCheckmark: {
    fontSize: 15,
    color: colors.accentLight,
    fontWeight: '600',
  },
});
