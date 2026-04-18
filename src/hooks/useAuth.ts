import { useSyncExternalStore } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

const listeners = new Set<() => void>();
let state: AuthState = { user: null, session: null, loading: true };
let initialized = false;

function emit() { listeners.forEach(l => l()); }

function set(next: Partial<AuthState>) {
  state = { ...state, ...next };
  emit();
}

function initialize() {
  if (initialized) return;
  initialized = true;
  supabase.auth.getSession().then(({ data }) => {
    set({ session: data.session, user: data.session?.user ?? null, loading: false });
  });
  supabase.auth.onAuthStateChange((_event, session) => {
    set({ session, user: session?.user ?? null, loading: false });
  });
}

function subscribe(fn: () => void) {
  initialize();
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function snapshot() { return state; }

export function useAuth() {
  const s = useSyncExternalStore(subscribe, snapshot, snapshot);
  return {
    ...s,
    signIn: (email: string, password: string) =>
      supabase.auth.signInWithPassword({ email, password }),
    signUp: (email: string, password: string) =>
      supabase.auth.signUp({ email, password }),
    signInWithGoogle: () =>
      supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      }),
    signInWithApple: () =>
      supabase.auth.signInWithOAuth({
        provider: "apple",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      }),
    signOut: () => supabase.auth.signOut(),
  };
}
