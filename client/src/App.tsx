import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./routes";
import { GoogleOAuthProvider } from "@react-oauth/google";

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

function App() {
  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </GoogleOAuthProvider>
  );
}

export default App;