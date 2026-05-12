import { createRoot } from "react-dom/client";
import { LanguageProvider } from "./contexts/LanguageContext";
import { AuthProvider } from "./contexts/AuthContext";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <LanguageProvider>
    <AuthProvider>
      <App />
    </AuthProvider>
  </LanguageProvider>
);
