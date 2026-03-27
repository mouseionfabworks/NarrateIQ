// app/screens/OutputScreen.js
// Ticket 017: coaching block added below the narrative.
// Collapsed by default. Tap header to expand/collapse with LayoutAnimation.
// Shows: summary (accent left border), question rationale, gaps list.

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../constants/theme';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const FEEDBACK_KEY = 'narrateiq_feedback';

export default function OutputScreen({ route, navigation }) {
  const { draft, outputMode, claimTypeId, coaching } = route.params ?? {};

  const [copiedMsg, setCopiedMsg] = useState('');
  const [activeFeedback, setActiveFeedback] = useState(null);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [coachingExpanded, setCoachingExpanded] = useState(false);

  async function handleCopy() {
    await Clipboard.setStringAsync(draft ?? '');
    setCopiedMsg('Copied!');
    setTimeout(() => setCopiedMsg(''), 2000);
  }

  async function saveFeedback(vote) {
    const entry = {
      timestamp: new Date().toISOString(),
      claimTypeId,
      outputMode,
      vote,
      draftLength: draft?.length ?? 0,
    };
    try {
      const existing = await AsyncStorage.getItem(FEEDBACK_KEY);
      const list = existing ? JSON.parse(existing) : [];
      list.push(entry);
      await AsyncStorage.setItem(FEEDBACK_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('Feedback save failed:', e);
    }
    setActiveFeedback(vote);
    setFeedbackMsg('Feedback saved');
    setTimeout(() => setFeedbackMsg(''), 2000);
  }

  function handleRegenerate() {
    navigation.goBack();
  }

  function handleStartNew() {
    navigation.navigate('Home', {});
  }

  function handleToggleCoaching() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCoachingExpanded((prev) => !prev);
  }

  if (!draft) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>
          No output received. Please go back and try again.
        </Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.primaryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const hasRationale = coaching?.question_rationale?.length > 0;
  const hasGaps = coaching?.gaps?.length > 0;

  return (
    <ScrollView
      style={styles.scrollOuter}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >

      {/* Meta pills */}
      <View style={styles.metaRow}>
        <View style={styles.metaPill}>
          <Text style={styles.metaText}>{outputMode}</Text>
        </View>
        <View style={styles.metaPill}>
          <Text style={styles.metaText}>{claimTypeId}</Text>
        </View>
      </View>

      {/* Draft */}
      <View style={styles.draftBox}>
        <Text style={styles.draftText}>{draft}</Text>
      </View>

      {/* Coaching block */}
      {coaching && (
        <View style={styles.coachingCard}>
          <TouchableOpacity
            style={styles.coachingHeader}
            onPress={handleToggleCoaching}
            activeOpacity={0.75}
          >
            <Text style={styles.coachingHeaderText}>Field Notes Coaching</Text>
            <Text style={styles.coachingChevron}>
              {coachingExpanded ? '▲' : '▼'}
            </Text>
          </TouchableOpacity>

          {coachingExpanded && (
            <View style={styles.coachingBody}>

              {/* Summary */}
              <View style={styles.coachingSummary}>
                <Text style={styles.coachingSummaryText}>{coaching.summary}</Text>
              </View>

              {/* Why We Asked */}
              {hasRationale && (
                <View style={styles.coachingSection}>
                  <Text style={styles.coachingSectionLabel}>Why We Asked</Text>
                  {coaching.question_rationale.map((item, i) => (
                    <View key={i} style={styles.rationaleItem}>
                      <Text style={styles.rationaleQuestion}>{item.question}</Text>
                      <Text style={styles.rationaleText}>{item.rationale}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Consider Noting Next Time */}
              {hasGaps && (
                <View style={styles.coachingSection}>
                  <Text style={styles.coachingSectionLabel}>Consider Noting Next Time</Text>
                  {coaching.gaps.map((gap, i) => (
                    <View key={i} style={styles.gapItem}>
                      <Text style={styles.gapBullet}>·</Text>
                      <Text style={styles.gapText}>{gap}</Text>
                    </View>
                  ))}
                </View>
              )}

            </View>
          )}
        </View>
      )}

      {/* Copy to Clipboard */}
      <TouchableOpacity
        style={[styles.primaryButton, copiedMsg ? styles.primaryButtonSuccess : null]}
        onPress={handleCopy}
        activeOpacity={0.85}
      >
        <Text style={styles.primaryButtonText}>
          {copiedMsg || 'Copy to Clipboard'}
        </Text>
      </TouchableOpacity>

      {/* Regenerate / Start New */}
      <View style={styles.secondaryRow}>
        <TouchableOpacity style={styles.secondaryButton} onPress={handleRegenerate}>
          <Text style={styles.secondaryButtonText}>Regenerate</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={handleStartNew}>
          <Text style={styles.secondaryButtonText}>Start New</Text>
        </TouchableOpacity>
      </View>

      {/* Feedback */}
      <View style={styles.feedbackSection}>
        <Text style={styles.feedbackLabel}>How was this output?</Text>

        <View style={styles.feedbackRow}>
          <TouchableOpacity
            style={[styles.emojiButton, activeFeedback === 'up' && styles.emojiButtonActive]}
            onPress={() => saveFeedback('up')}
          >
            <Text style={styles.emojiText}>👍</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.emojiButton, activeFeedback === 'down' && styles.emojiButtonActive]}
            onPress={() => saveFeedback('down')}
          >
            <Text style={styles.emojiText}>👎</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.voteRow}>
          {['Ready', 'Needed Edits', 'Not Usable'].map((label) => (
            <TouchableOpacity
              key={label}
              style={[
                styles.feedbackVoteButton,
                activeFeedback === label && styles.feedbackVoteButtonActive,
              ]}
              onPress={() => saveFeedback(label)}
            >
              <Text style={[
                styles.feedbackVoteText,
                activeFeedback === label && styles.feedbackVoteTextActive,
              ]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {feedbackMsg ? <Text style={styles.feedbackConfirm}>{feedbackMsg}</Text> : null}
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollOuter: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  errorText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    marginTop: 40,
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: colors.bgPrimary,
  },

  // Meta
  metaRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  metaPill: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  metaText: {
    fontSize: 13,
    color: colors.textSecondary,
  },

  // Draft
  draftBox: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 16,
    marginBottom: 14,
  },
  draftText: {
    fontSize: 15,
    color: colors.textPrimary,
    lineHeight: 23,
  },

  // Coaching
  coachingCard: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    marginBottom: 14,
    overflow: 'hidden',
  },
  coachingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  coachingHeaderText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  coachingChevron: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  coachingBody: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: 16,
    gap: 16,
  },
  coachingSummary: {
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
    paddingLeft: 12,
  },
  coachingSummaryText: {
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 21,
  },
  coachingSection: {
    gap: 10,
  },
  coachingSectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  rationaleItem: {
    backgroundColor: colors.bgPrimary,
    borderRadius: 8,
    padding: 12,
    gap: 4,
  },
  rationaleQuestion: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.accentLight,
    lineHeight: 19,
  },
  rationaleText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
  },
  gapItem: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  gapBullet: {
    fontSize: 18,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  gapText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
  },

  // Buttons
  primaryButton: {
    backgroundColor: colors.accent,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryButtonSuccess: {
    backgroundColor: colors.success,
  },
  primaryButtonText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: colors.textSecondary,
    fontSize: 14,
  },

  // Feedback
  feedbackSection: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 14,
  },
  feedbackLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 10,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  feedbackRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 10,
  },
  emojiButton: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  emojiButtonActive: {
    borderColor: colors.accent,
    backgroundColor: colors.bgCard,
  },
  emojiText: {
    fontSize: 22,
  },
  voteRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  feedbackVoteButton: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: colors.bgCard,
  },
  feedbackVoteButtonActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
  },
  feedbackVoteText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  feedbackVoteTextActive: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  feedbackConfirm: {
    textAlign: 'center',
    color: colors.success,
    fontSize: 13,
    marginTop: 8,
  },
});
