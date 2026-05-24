"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import type { User } from "@supabase/supabase-js";

type UserProfile = {
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  role: string | null;
};

type UserContextType = {
  user: User | null;
  profile: UserProfile | null;
  userId: string | null;
  isAdmin: boolean;
  loading: boolean;
};

const UserContext = createContext<UserContextType>({
  user: null,
  profile: null,
  userId: null,
  isAdmin: false,
  loading: true,
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("full_name, username, avatar_url, role")
      .eq("id", userId)
      .single();
    if (data) setProfile(data);
  };

  useEffect(() => {
    // One single getSession call for the whole app — fast, no network
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) fetchProfile(u.id);
      setLoading(false);
    });

    // One single listener for the whole app
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) fetchProfile(u.id);
      else { setProfile(null); }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <UserContext.Provider value={{
      user,
      profile,
      userId: user?.id ?? null,
      isAdmin: profile?.role === "admin",
      loading,
    }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}