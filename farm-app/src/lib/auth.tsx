"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { isDemoMode, supabase } from "./supabaseClient";
import { demoCurrentUserId, demoListProfiles, demoSignIn, demoSignOut } from "./mock/store";
import { Profile } from "./types";

interface AuthState {
  loading: boolean;
  profile: Profile | null;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);

  async function loadProfile(userId: string) {
    if (isDemoMode) {
      setProfile(demoListProfiles().find((p) => p.id === userId) ?? null);
      return;
    }
    const { data } = await supabase!.from("profiles").select("*").eq("id", userId).single();
    setProfile((data as Profile) ?? null);
  }

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    async function init() {
      if (isDemoMode) {
        const uid = demoCurrentUserId();
        if (uid) await loadProfile(uid);
        setLoading(false);
        return;
      }
      const { data } = await supabase!.auth.getSession();
      if (data.session?.user) await loadProfile(data.session.user.id);
      setLoading(false);

      const { data: listener } = supabase!.auth.onAuthStateChange((_event, session) => {
        if (session?.user) loadProfile(session.user.id);
        else setProfile(null);
      });
      unsubscribe = () => listener.subscription.unsubscribe();
    }

    init();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  async function signIn(email: string, password: string) {
    if (isDemoMode) {
      setProfile(demoSignIn());
      return {};
    }
    const { error } = await supabase!.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return {};
  }

  async function signOut() {
    if (isDemoMode) {
      demoSignOut();
      setProfile(null);
      return;
    }
    await supabase!.auth.signOut();
    setProfile(null);
  }

  async function refreshProfile() {
    if (profile) await loadProfile(profile.id);
  }

  return (
    <AuthContext.Provider value={{ loading, profile, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
