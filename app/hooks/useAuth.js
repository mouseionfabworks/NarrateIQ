import { useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { supabase } from '../utils/supabaseClient';

const ACCESS_KEY = 'narrateiq_access_token';
const REFRESH_KEY = 'narrateiq_refresh_token';

async function saveSession(session) {
  await SecureStore.setItemAsync(ACCESS_KEY, session.access_token);
  await SecureStore.setItemAsync(REFRESH_KEY, session.refresh_token);
}

async function clearSession() {
  await SecureStore.deleteItemAsync(ACCESS_KEY);
  await SecureStore.deleteItemAsync(REFRESH_KEY);
}

async function restoreSession() {
  const access_token = await SecureStore.getItemAsync(ACCESS_KEY);
  const refresh_token = await SecureStore.getItemAsync(REFRESH_KEY);
  if (!access_token || !refresh_token) return null;
  const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
  if (error) {
    await clearSession();
    return null;
  }
  return data.session;
}

export function useAuth() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    restoreSession().then(s => {
      setSession(s);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    await saveSession(data.session);
    setSession(data.session);
  }

  async function signUp(email, password) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    if (data.session) {
      await saveSession(data.session);
      setSession(data.session);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    await clearSession();
    setSession(null);
  }

  return { session, loading, signIn, signUp, signOut };
}
