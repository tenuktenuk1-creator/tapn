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
  signIn: (email: string, password: string) => Promise<{ data: { user: { id: string } | null; } | null; error: Error | null; }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  // loading = true until BOTH session AND role are resolved
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPartner, setIsPartner] = useState(false);
  const [role, setRole] = useState<'user' | 'partner' | 'admin' | null>(null);

  useEffect(() => {
    let initialised = false;

    // Initial session check — fetch session + role before setting loading=false
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await refreshRole(session.user.id);
      }
      setLoading(false);
      initialised = true;
    });

    // Subscribe to subsequent auth changes (sign in, sign out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Skip the first INITIAL_SESSION event — already handled by getSession above
        if (!initialised && event === 'INITIAL_SESSION') return;

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await refreshRole(session.user.id);
        } else {
          setIsAdmin(false);
          setIsPartner(false);
          setRole(null);
        }

        setLoading(false);
      }
    );

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
    setUser(null);
    setSession(null);
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
