import React from "react";
import { LogOut } from "lucide-react";
import { useAuth } from "../context/AppContext";

function displayNameFor(user) {
  return user?.displayName || user?.email || "Reader";
}

function initialsFor(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  if (!parts.length) return "R";
  return parts.map((part) => part[0]).join("").toUpperCase();
}


function AccountCard() {
  const { user, signOut } = useAuth();
  const name = displayNameFor(user);

  return (
    <div className="account-card">
      <div className="account-avatar">
        {user?.photoURL ? (
          <img src={user.photoURL} alt={name} />
        ) : (
          <span>{initialsFor(name)}</span>
        )}
      </div>
      <div className="account-info">
        <span>Signed in as</span>
        <strong>{name}</strong>
      </div>
      <button 
        className="icon-button account-signout" 

        onClick={signOut} 
        aria-label="Sign out" 
        title="Sign out" 
        type="button"
      >
        <LogOut size={17} />
      </button>
    </div>
  );
}

export default AccountCard;
