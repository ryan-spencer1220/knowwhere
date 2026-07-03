import type { Session } from "@supabase/supabase-js";
import * as AppleAuthentication from "expo-apple-authentication";
import { makeRedirectUri } from "expo-auth-session";
import * as QueryParams from "expo-auth-session/build/QueryParams";
import * as Linking from "expo-linking";
import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { supabase } from "@/lib/supabase";

// Dismisses the in-app browser when an OAuth redirect returns to the app.
WebBrowser.maybeCompleteAuthSession();

// Turns the redirect URL returned by an OAuth flow into a Supabase session.
// Supabase appends the tokens (or an error) to the redirect; parse and persist.
async function createSessionFromUrl(url: string) {
  const { params, errorCode } = QueryParams.getQueryParams(url);
  if (errorCode) throw new Error(errorCode);

  const { access_token, refresh_token } = params;
  if (!access_token) return;

  const { error } = await supabase.auth.setSession({ access_token, refresh_token });
  if (error) throw error;
}

type SignUpResult = {
  // True when Supabase created a session immediately (email confirmation off).
  // False means a confirmation email was sent and the user must verify first.
  needsEmailConfirmation: boolean;
};

type AuthContextValue = {
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    profile?: { displayName?: string; username?: string },
  ) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  // Returns false when the user cancels the native Apple/Google flow (not an
  // error worth surfacing); throws on real failures.
  signInWithApple: () => Promise<boolean>;
  signInWithGoogle: () => Promise<boolean>;
};

// Apple's native sheet is only available on iOS 13+.
export const isAppleSignInSupported = Platform.OS === "ios";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Restore any persisted session on launch, then subscribe to changes.
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isLoading,
      signIn: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      },
      signUp: async (email, password, profile) => {
        // These land in raw_user_meta_data; the handle_new_user trigger copies
        // display_name and username into the profiles row.
        const metadata: Record<string, string> = {};
        if (profile?.displayName) metadata.display_name = profile.displayName;
        if (profile?.username) metadata.username = profile.username;

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: Object.keys(metadata).length > 0 ? { data: metadata } : undefined,
        });
        if (error) throw error;
        return { needsEmailConfirmation: data.session === null };
      },
      signOut: async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      },
      resetPassword: async (email) => {
        const redirectTo = Linking.createURL("/reset-password");
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
        if (error) throw error;
      },
      updatePassword: async (password) => {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
      },
      signInWithApple: async () => {
        try {
          const credential = await AppleAuthentication.signInAsync({
            requestedScopes: [
              AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
              AppleAuthentication.AppleAuthenticationScope.EMAIL,
            ],
          });
          if (!credential.identityToken) {
            throw new Error("Apple sign-in did not return an identity token.");
          }
          const { error } = await supabase.auth.signInWithIdToken({
            provider: "apple",
            token: credential.identityToken,
          });
          if (error) throw error;
          return true;
        } catch (err) {
          // The user tapped Cancel on the native sheet — not a real error.
          if (err instanceof Error && "code" in err && err.code === "ERR_REQUEST_CANCELED") {
            return false;
          }
          throw err;
        }
      },
      signInWithGoogle: async () => {
        const redirectTo = makeRedirectUri();
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo, skipBrowserRedirect: true },
        });
        if (error) throw error;
        if (!data?.url) throw new Error("Could not start Google sign-in.");

        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
        if (result.type === "success") {
          await createSessionFromUrl(result.url);
          return true;
        }
        // "cancel" / "dismiss" — the user backed out of the browser.
        return false;
      },
    }),
    [session, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
