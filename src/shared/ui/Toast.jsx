import React from "react";
import { Check, AlertCircle } from "lucide-react";

function Toast({ message, type = "success" }) {
  if (!message) return null;
  
  return (
    <div className={`toast ${type}`} role="status">
      {type === "error" ? <AlertCircle size={17} /> : <Check size={17} />}
      <span>{message}</span>
    </div>
  );
}

export default Toast;
