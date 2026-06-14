'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

type User = { id: string; email: string; name?: string } | null;

type AuthContextType = {
  user: User;
  session: import('@supabase/supabase-js').Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({ user: null, session: null, loading: true, signOut: async () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [session, setSession] = useState<import('@supabase/supabase-js').Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const s = data.session;
      setSession(s);
      const u = s?.user;
      setUser(u ? { id: u.id, email: u.email!, name: u.user_metadata?.full_name } : null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      const u = s?.user;
      setUser(u ? { id: u.id, email: u.email!, name: u.user_metadata?.full_name } : null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    window.location.href = '/';
  };

  return <AuthContext.Provider value={{ user, session, loading, signOut }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
