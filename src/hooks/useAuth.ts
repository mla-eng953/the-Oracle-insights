import { useSyncExternalStore } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { identify } from "@/lib/telemetry";

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
    if (data.session?.user) identify(data.session.user.id, data.session.user.email);
  });
  supabase.auth.onAuthStateChange((_event, session) => {
    set({ session, user: session?.user ?? null, loading: false });
    if (session?.user) identify(session.user.id, session.user.email);
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
