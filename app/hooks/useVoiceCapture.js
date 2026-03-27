import { useState } from 'react';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';

export default function useVoiceCapture() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState(null);

  useSpeechRecognitionEvent('result', (event) => {
    const best = event.results[0];
    if (!best) return;
    if (event.isFinal) {
      setTranscript((prev) => (prev ? prev + ' ' + best.transcript : best.transcript));
      setInterimTranscript('');
    } else {
      setInterimTranscript(best.transcript);
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    setError(event.message || 'Speech recognition error.');
    setIsRecording(false);
    setInterimTranscript('');
  });

  useSpeechRecognitionEvent('end', () => {
    setIsRecording(false);
    setInterimTranscript('');
  });

  async function startRecording() {
    setError(null);
    const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!granted) {
      setError('Microphone permission denied. Please enable it in Settings.');
      return;
    }
    setIsRecording(true);
    ExpoSpeechRecognitionModule.start({
      lang: 'en-US',
      interimResults: true,
      continuous: true,
    });
  }

  function stopRecording() {
    ExpoSpeechRecognitionModule.stop();
    setIsRecording(false);
    setInterimTranscript('');
  }

  function clearTranscript() {
    setTranscript('');
    setInterimTranscript('');
    setError(null);
  }

  return {
    isRecording,
    transcript,
    interimTranscript,
    startRecording,
    stopRecording,
    clearTranscript,
    error,
  };
}
