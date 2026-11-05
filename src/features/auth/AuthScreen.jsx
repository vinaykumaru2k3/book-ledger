import React from "react";
import AuthArt from "./AuthArt";
import AuthCard from "./AuthCard";

/** Sign-in screen laid out as an open book: illustration on the left, form on the right. */
function AuthScreen(props) {
  return (
    <div className="auth-shell">
      <div className="auth-panel">
        {/* Decorative centred gold bookmark ribbon */}
        <div className="auth-bookmark-ribbon" />
        <AuthArt />
        <AuthCard {...props} />
      </div>
    </div>
  );
}

export default AuthScreen;
