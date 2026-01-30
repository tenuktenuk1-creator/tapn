import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  isPartner: boolean;
  role: 'user' | 'partner' | 'admin' | null;
  refreshRole: (userId?: string) => Promise<'user' | 'partner' | 'admin'>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ data: { user: { id: string } | null; } | null;error: Error | null;}>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPartner, setIsPartner] = useState(false);
  const [role, setRole] = useState<'user' | 'partner' | 'admin' | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        if (session?.user) {
          setTimeout(() => {
            refreshRole(session.user.id);
          }, 0);
        } else {
          setIsAdmin(false);
          setIsPartner(false);
          setRole(null);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (session?.user) {
        refreshRole(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const refreshRole = async (userId?: string): Promise<'user' | 'partner' | 'admin'> => {
    const id = userId ?? (await supabase.auth.getUser()).data.user?.id;
    if (!id) {
      setIsAdmin(false);
      setIsPartner(false);
      setRole(null);
      return 'user';
    }

    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', id)
      .maybeSingle();

    if (error) {
      setIsAdmin(false);
      setIsPartner(false);
      setRole('user');
      return 'user';
    }

    const nextRole = (data?.role as 'user' | 'partner' | 'admin' | undefined) ?? 'user';
    setRole(nextRole);
    setIsAdmin(nextRole === 'admin');
    setIsPartner(nextRole === 'partner');
    return nextRole;
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });

    return { error };
  };

  const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { data, error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setIsAdmin(false);
    setIsPartner(false);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isAdmin, isPartner, role, refreshRole, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}