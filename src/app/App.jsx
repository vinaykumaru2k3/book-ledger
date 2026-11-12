import React, { Suspense, lazy, useState } from "react";
import LoadingScreen from "../shared/ui/LoadingScreen";
import LandingPage from "../features/landing/LandingPage";
import AuthScreen from "../features/auth/AuthScreen";
import { ThemeProvider } from "../features/theme/ThemeContext";
import { AppProvider, useAuth } from "./AppContext";
import { isPublicView } from "./routes";
import { usePathRoute } from "./usePathRoute";
import Workspace from "./Workspace";
import PublicShell from "./shell/PublicShell";

// Design-system showcase: public, unlinked, loaded only when visited.
const DevUiPage = lazy(() => import("./DevUiPage"));

/** Decides what to show: loading, a public page, marketing page, sign-in, or the workspace. */
function AppGate() {
  const auth = useAuth();
  const [view, navigate, location] = usePathRoute();
  const [showLanding, setShowLanding] = useState(true);
  const isDevUi = window.location.pathname.replace(/\/$/, "") === "/dev/ui";

  if (isDevUi) {
    return (
      <Suspense fallback={<LoadingScreen label="Loading design system" />}>
        <DevUiPage />
      </Suspense>
    );
  }
  if (!auth.authReady) return <LoadingScreen label="Connecting with Database Ledger" />;
  if (auth.user) return <Workspace view={view} navigate={navigate} location={location} />;

  if (isPublicView(view)) {
    return (
      <PublicShell
        view={view}
        location={location}
        onSignIn={() => {
          setShowLanding(false);
          navigate("all");
        }}
      />
    );
  }
  if (showLanding) return <LandingPage onEnter={() => setShowLanding(false)} />;

  return (
    <AuthScreen
      error={auth.authError}
      onEmailSubmit={auth.signInWithEmail}
      onGoogleSignIn={auth.signInWithGoogle}
      onResetPassword={auth.resetPassword}
      onBackToLanding={() => setShowLanding(true)}
    />
  );
}

export default function App() {
  return (
    <AppProvider>
      <ThemeProvider>
        <AppGate />
      </ThemeProvider>
    </AppProvider>
  );
}
