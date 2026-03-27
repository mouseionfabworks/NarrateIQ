// app/screens/ReviewScreen.js
// Ticket 014: LLM-based claim type detection on mount.
// Ticket 015: token tracking via narrateApi (transparent — no changes here).
// Ticket 017: coaching captured from API response and forwarded to OutputScreen.
//
// Status machine:
// 'detecting' → 'detect_clarify'? → 'idle' → 'loading' → 'needs_clarification'
//                                                        → 'ready'
//                                         → 'submitting' → 'ready'
//                                                        → 'error'

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { claimTypeMap } from '../constants/claimTypes';
import { detectClaimType, reviewNotes, generateDraft } from '../utils/narrateApi';
import { colors } from '../constants/theme';

export default function ReviewScreen({ route, navigation }) {
  const { transcript = '', outputMode = 'Narrative' } = route.params ?? {};

  const [status, setStatus] = useState('detecting');
  const [claimTypeId, setClaimTypeId] = useState('general');
  const [detectQuestion, setDetectQuestion] = useState('');
  const [detectAnswer, setDetectAnswer] = useState('');
  const [draft, setDraft] = useState('');
  const [coaching, setCoaching] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');

  const claimLabel = claimTypeMap[claimTypeId]?.label ?? claimTypeId;

  // Auto-detect on mount
  useEffect(() => {
    runDetection(transcript);
  }, []);

  async function runDetection(notes) {
    setStatus('detecting');
    const result = await detectClaimType(notes);
    setClaimTypeId(result.claimTypeId);
    if (result.needsClarification && result.clarifyQuestion) {
      setDetectQuestion(result.clarifyQuestion);
      setStatus('detect_clarify');
    } else {
      setStatus('idle');
    }
  }

  async function handleDetectClarifySubmit() {
    const combined = transcript + '\n' + detectAnswer;
    setDetectAnswer('');
    await runDetection(combined);
  }

  async function handleGenerateReview() {
    setStatus('loading');
    setErrorMsg('');
    const result = await reviewNotes(transcript, outputMode, claimTypeId);

    if (result.status === 'needs_clarification') {
      const qs = result.questions ?? [];
      setQuestions(qs);
      setAnswers(qs.map((q) => ({ question: q, answer: '' })));
      setStatus('needs_clarification');
    } else if (result.status === 'ready') {
      setDraft(result.draft ?? '');
      setCoaching(result.coaching ?? null);
      setStatus('ready');
    } else {
      setErrorMsg(result.message ?? 'Unknown error.');
      setStatus('error');
    }
  }

  async function handleSubmitAnswers() {
    setStatus('submitting');
    setErrorMsg('');
    const result = await generateDraft(transcript, answers, outputMode, claimTypeId);

    if (result.status === 'ready') {
      setDraft(result.draft ?? '');
      setCoaching(result.coaching ?? null);
      setStatus('ready');
    } else {
      setErrorMsg(result.message ?? 'Unknown error.');
      setStatus('error');
    }
  }

  function handleAnswerChange(index, text) {
    setAnswers((prev) => prev.map((a, i) => (i === index ? { ...a, answer: text } : a)));
  }

  function handleEditNotes() {
    navigation.navigate('Home', { existingTranscript: transcript });
  }

  const isLoading = status === 'loading' || status === 'submitting';

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bgPrimary }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        {/* Meta row */}
        <View style={styles.metaRow}>
          <View style={styles.metaPill}>
            {status === 'detecting' && (
              <ActivityIndicator
                size="small"
                color={colors.textSecondary}
                style={styles.pillSpinner}
              />
            )}
            <Text style={styles.metaText}>
              {status === 'detecting' ? 'Identifying...' : claimLabel}
            </Text>
          </View>
          <View style={styles.metaPill}>
            <Text style={styles.metaText}>{outputMode}</Text>
          </View>
        </View>

        {/* Captured notes */}
        <Text style={styles.sectionLabel}>Captured Notes</Text>
        <ScrollView
          style={styles.transcriptBox}
          nestedScrollEnabled={true}
          showsVerticalScrollIndicator={true}
        >
          <Text style={styles.transcriptText}>{transcript || 'No notes captured.'}</Text>
        </ScrollView>

        {/* Detecting spinner */}
        {status === 'detecting' && (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={colors.accent} />
            <Text style={styles.loadingText}>Identifying claim type...</Text>
          </View>
        )}

        {/* Detection clarification — single question */}
        {status === 'detect_clarify' && (
          <View>
            <Text style={styles.sectionLabel}>One Question First</Text>
            <View style={styles.questionBlock}>
              <Text style={styles.questionText}>{detectQuestion}</Text>
              <TextInput
                style={styles.answerInput}
                placeholder="Your answer..."
                placeholderTextColor={colors.textSecondary}
                value={detectAnswer}
                onChangeText={setDetectAnswer}
                multiline={true}
                numberOfLines={3}
                textAlignVertical="top"
                scrollEnabled={false}
                returnKeyType="done"
                blurOnSubmit={true}
                keyboardAppearance="dark"
              />
            </View>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleDetectClarifySubmit}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryButtonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Error */}
        {status === 'error' && (
          <Text style={styles.error}>{errorMsg}</Text>
        )}

        {/* Loading */}
        {isLoading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={colors.accent} />
            <Text style={styles.loadingText}>
              {status === 'loading' ? 'Reviewing notes...' : 'Generating draft...'}
            </Text>
          </View>
        )}

        {/* Clarification questions from review */}
        {status === 'needs_clarification' && (
          <View>
            <Text style={styles.sectionLabel}>Additional Information Needed</Text>
            {questions.map((q, i) => (
              <View key={i} style={styles.questionBlock}>
                <Text style={styles.questionText}>{i + 1}. {q}</Text>
                <TextInput
                  style={styles.answerInput}
                  placeholder="Optional — leave blank to skip"
                  placeholderTextColor={colors.textSecondary}
                  value={answers[i]?.answer ?? ''}
                  onChangeText={(text) => handleAnswerChange(i, text)}
                  multiline={true}
                  numberOfLines={3}
                  textAlignVertical="top"
                  scrollEnabled={false}
                  returnKeyType="done"
                  blurOnSubmit={true}
                  keyboardAppearance="dark"
                />
              </View>
            ))}
            <TouchableOpacity style={styles.primaryButton} onPress={handleSubmitAnswers} activeOpacity={0.85}>
              <Text style={styles.primaryButtonText}>Submit Answers</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Draft output */}
        {status === 'ready' && (
          <View>
            <Text style={styles.sectionLabel}>Generated Draft</Text>
            <View style={styles.draftBox}>
              <Text style={styles.draftText}>{draft}</Text>
            </View>
            <TouchableOpacity
              style={styles.primaryButton}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('Output', { draft, outputMode, claimTypeId, coaching })}
            >
              <Text style={styles.primaryButtonText}>View Output →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Initial generate button */}
        {status === 'idle' && (
          <TouchableOpacity style={styles.primaryButton} onPress={handleGenerateReview} activeOpacity={0.85}>
            <Text style={styles.primaryButtonText}>Generate Review</Text>
          </TouchableOpacity>
        )}

        {/* Retry after error */}
        {status === 'error' && (
          <TouchableOpacity style={styles.primaryButton} onPress={handleGenerateReview} activeOpacity={0.85}>
            <Text style={styles.primaryButtonText}>Retry</Text>
          </TouchableOpacity>
        )}

        {/* Secondary actions */}
        <View style={styles.secondaryRow}>
          <TouchableOpacity style={styles.secondaryButton} onPress={handleEditNotes}>
            <Text style={styles.secondaryButtonText}>Edit Notes</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.goBack()}>
            <Text style={styles.secondaryButtonText}>Back</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 180,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  pillSpinner: {
    marginRight: 6,
  },
  metaText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  transcriptBox: {
    maxHeight: 130,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  transcriptText: {
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 21,
  },
  error: {
    color: colors.error,
    marginBottom: 12,
    textAlign: 'center',
    fontSize: 13,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 10,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  questionBlock: {
    marginBottom: 20,
  },
  questionText: {
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: 8,
    lineHeight: 21,
  },
  answerInput: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.bgInputBorder,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
    color: colors.textPrimary,
  },
  draftBox: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 14,
    marginBottom: 14,
  },
  draftText: {
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  primaryButton: {
    backgroundColor: colors.accent,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryButtonText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
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
});
