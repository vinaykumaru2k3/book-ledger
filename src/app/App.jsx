import React, { Suspense, lazy, useState } from "react";
import LoadingScreen from "../shared/ui/LoadingScreen";
import LandingPage from "../features/landing/LandingPage";
import AuthScreen from "../features/auth/AuthScreen";
import { AppProvider, useAuth } from "./AppContext";
import Workspace from "./Workspace";

// Design-system showcase: public, unlinked, loaded only when visited.
const DevUiPage = lazy(() => import("./DevUiPage"));

/** Decides what to show: loading, marketing page, sign-in, or the workspace. */
function AppGate() {
  const auth = useAuth();
  const isDevUi = window.location.pathname.replace(/\/$/, "") === "/dev/ui";
  const [showLanding, setShowLanding] = useState(true);

  if (isDevUi) {
    return (
      <Suspense fallback={<LoadingScreen label="Loading design system" />}>
        <DevUiPage />
      </Suspense>
    );
  }
  if (!auth.authReady) return <LoadingScreen label="Connecting with Database Ledger" />;
  if (auth.user) return <Workspace />;
  if (showLanding) return <LandingPage onEnter={() => setShowLanding(false)} />;

  return (
    <AuthScreen
      error={auth.authError}
      onEmailSubmit={auth.signInWithEmail}
      onGoogleSignIn={auth.signInWithGoogle}
      onBackToLanding={() => setShowLanding(true)}
    />
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppGate />
    </AppProvider>
  );
}
