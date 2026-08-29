import {
  createContext,
  useContext,
  createSignal,
  onMount,
  onCleanup,
  ParentProps,
  Accessor,
} from "solid-js";
import type { User, Session, AuthError } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { setCachedUserId } from "../lib/userContext";

export interface AuthContextType {
  user: Accessor<User | null>;
  session: Accessor<Session | null>;
  isLoading: Accessor<boolean>;
  isAuthenticated: () => boolean;
  signInWithEmail: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUpWithEmail: (
    email: string,
    password: string,
    fullName?: string
  ) => Promise<{ data: { user: User | null; session: Session | null }; error: AuthError | null }>;
  signInWithGoogle: () => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>();

export const AuthProvider = (props: ParentProps) => {
  const [user, setUser] = createSignal<User | null>(null);
  const [session, setSession] = createSignal<Session | null>(null);
  const [isLoading, setIsLoading] = createSignal<boolean>(true);
  let authSubscription: { unsubscribe: () => void } | null = null;

  onMount(async () => {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (!error && data.session) {
        setSession(data.session);
        setUser(data.session.user);
        setCachedUserId(data.session.user.id);
      } else {
        setSession(null);
        setUser(null);
        setCachedUserId(null);
      }
    } catch (err) {
      console.error("Error retrieving Supabase session:", err);
    } finally {
      setIsLoading(false);
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setCachedUserId(newSession?.user?.id ?? null);
      setIsLoading(false);
    });

    authSubscription = subscription;
  });

  onCleanup(() => {
    authSubscription?.unsubscribe();
  });

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUpWithEmail = async (email: string, password: string, fullName?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName || "",
        },
      },
    });
    return { data, error };
  };

  const signInWithGoogle = async () => {
    const redirectTo = window.location.origin;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
      },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setCachedUserId(null);
  };

  const value: AuthContextType = {
    user,
    session,
    isLoading,
    isAuthenticated: () => !!session(),
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {props.children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
