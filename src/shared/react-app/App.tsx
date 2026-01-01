import { BrowserRouter as Router, Routes, Route } from "react-router";
import HomePage from "@/react-app/pages/Home";
import RacePlannerPage from "@/react-app/pages/RacePlanner";
import UserGuidePage from "@/react-app/pages/UserGuide";
import PrivacyGuidePage from "@/react-app/pages/PrivacyGuide";
import { UnitProvider } from "@/react-app/contexts/UnitContext";
import { ThemeProvider } from "@/react-app/contexts/ThemeContext";
import { Header } from "@/react-app/components/Header";

export default function App() {
  return (
    <ThemeProvider>
      <UnitProvider>
        <Router>
          <Header />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/guide" element={<UserGuidePage />} />
            <Route path="/privacy" element={<PrivacyGuidePage />} />
            <Route path="/race/:id" element={<RacePlannerPage />} />
          </Routes>
        </Router>
      </UnitProvider>
    </ThemeProvider>
  );
}
