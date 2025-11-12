import { createContext, useContext } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface AuthUser {
  id: string;
  email: string;
  role: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (payload: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function fetchCurrentUser(): Promise<AuthUser | null> {
  const res = await fetch("/api/auth/me", { credentials: "include" });
  if (res.status === 401) {
    return null;
  }
  if (!res.ok) {
    throw new Error(await res.text());
  }
  const body = await res.json();
  return body.user as AuthUser;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const authQuery = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: fetchCurrentUser,
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: async (payload: { email: string; password: string }) => {
      const res = await apiRequest("POST", "/api/auth/login", payload);
      await res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout", {});
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
  });

  const login = async (payload: { email: string; password: string }) => {
    await loginMutation.mutateAsync(payload);
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  const refresh = async () => {
    await authQuery.refetch();
  };

  return (
    <AuthContext.Provider
      value={{
        user: authQuery.data ?? null,
        isLoading: authQuery.isLoading,
        login,
        logout,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
