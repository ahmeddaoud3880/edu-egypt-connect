import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

type AppRole = "ministry" | "directorate" | "administration" | "school" | "teacher" | "student" | "parent" | "support" | "super_admin";

interface AuthState {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  profile: {
    id: string;
    full_name: string;
    full_name_ar: string;
    national_id: string | null;
    parent_national_id: string | null;
    school_id: string | null;
  } | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string, role: AppRole) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [profile, setProfile] = useState<AuthState["profile"]>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (userId: string) => {
    try {
      const [roleRes, profileRes] = await Promise.all([
        (supabase as any).from("user_roles").select("role").eq("user_id", userId).limit(1).single(),
        (supabase as any)
          .from("profiles")
          .select("id, full_name, full_name_ar, national_id, parent_national_id, school_id")
          .eq("id", userId)
          .limit(1)
          .maybeSingle(),
      ]);
      if (roleRes.data) setRole((roleRes.data as any).role as AppRole);

      let p = profileRes.data as AuthState["profile"] | null;
      if (!p) {
        const { data: byUser, error: profileByUserErr } = await (supabase as any)
          .from("profiles")
          .select("id, full_name, full_name_ar, national_id, parent_national_id, school_id")
          .eq("user_id", userId)
          .limit(1)
          .maybeSingle();
        if (!profileByUserErr) {
          p = byUser as AuthState["profile"] | null;
        }
      }

      if (p && !p.school_id) {
        const { data: scope } = await (supabase as any)
          .from("user_scope_assignments")
          .select("school_id")
          .eq("user_id", userId)
          .eq("is_active", true)
          .not("school_id", "is", null)
          .limit(1)
          .maybeSingle();
        const sid = scope?.school_id ?? null;
        if (sid) setProfile({ ...p, school_id: sid });
        else setProfile(p);
      } else if (p) {
        setProfile(p);
      } else {
        setProfile(null);
      }
    } catch (e) {
      console.error("Error fetching user data:", e);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(() => fetchUserData(session.user.id), 0);
      } else {
        setRole(null);
        setProfile(null);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUp = async (email: string, password: string, fullName: string, selectedRole: AppRole) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) return { error: error.message };
    if (data.user) {
      // Assign role
      await (supabase as any).from("user_roles").insert({ user_id: data.user.id, role: selectedRole } as any);
      // Update profile
      await (supabase as any).from("profiles").update({ full_name: fullName, full_name_ar: fullName } as any).eq("id", data.user.id);
      setRole(selectedRole);
    }
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, role, profile, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
