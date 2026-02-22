import { useState, useEffect, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "admin" | "user";

interface AuthState {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  isLoading: boolean;
  isAdmin: boolean;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    role: null,
    isLoading: true,
    isAdmin: false,
  });

  const fetchUserRole = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      // Don't spam console; default to user.
      return "user" as AppRole;
    }

    return (data?.role as AppRole) || "user";
  }, []);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setAuthState(prev => {
          const hasSession = !!session?.user;
          // Don't set loading when we already have session+role (e.g. TOKEN_REFRESHED on tab focus).
          // Otherwise RequireAdmin returns null and unmounts the whole admin tree, losing form state.
          const isLoading = hasSession && prev.role == null;
          return {
            ...prev,
            session,
            user: session?.user ?? null,
            isLoading,
          };
        });

        // Defer role fetching + first-user claim (runs only if system has no admin yet)
        if (session?.user) {
          setTimeout(() => {
            // 1) Try to claim ownership silently
            supabase.functions
              .invoke("bootstrap-admin")
              .then(() => fetchUserRole(session.user.id))
              .then((role) => {
                setAuthState((prev) => ({
                  ...prev,
                  role,
                  isAdmin: role === "admin",
                    isLoading: false,
                }));
              })
              .catch(() => {
                // Ignore: not critical, user might not be allowed / admin already exists
                fetchUserRole(session.user.id).then((role) => {
                  setAuthState((prev) => ({
                    ...prev,
                    role,
                    isAdmin: role === "admin",
                      isLoading: false,
                  }));
                });
              });
          }, 0);
        } else {
          setAuthState((prev) => ({
            ...prev,
            role: null,
            isAdmin: false,
            isLoading: false,
          }));
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthState(prev => ({
        ...prev,
        session,
        user: session?.user ?? null,
        // If we have a session, keep loading until role is fetched.
        isLoading: !!session?.user,
      }));
      
      if (session?.user) {
        fetchUserRole(session.user.id).then(role => {
          setAuthState(prev => ({
            ...prev,
            role,
            isAdmin: role === "admin",
            isLoading: false,
          }));
        });
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchUserRole]);

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });
    // data.session null = e-posta doğrulama gerekebilir
    return { error, data, needsEmailConfirmation: !error && data?.user && !data?.session };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signInWithGoogle = async () => {
    const redirectTo = `${window.location.origin}/catalog/all`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
      },
    });
    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  return {
    ...authState,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
  };
}
