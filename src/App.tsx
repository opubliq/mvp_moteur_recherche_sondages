import { Navigate, Route, Routes } from "react-router-dom";
import AppShell from "./components/AppShell";
import SearchPage from "./pages/SearchPage";
import CorpusPage from "./pages/CorpusPage";
import AgentPage from "./pages/AgentPage";
import VerbatimsPage from "./pages/VerbatimsPage";
import SurveyPage from "./pages/SurveyPage";
import AdvancedExportPage from "./pages/AdvancedExportPage";
import QuestionDashboard from "./components/QuestionDashboard";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";

export default function App() {
  return (
    <Routes>
      <Route path="/connexion" element={<LoginPage />} />
      <Route path="/inscription" element={<SignupPage />} />
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/recherche" replace />} />
        <Route path="/recherche" element={<SearchPage />} />
        <Route path="/corpus" element={<CorpusPage />} />
        <Route path="/agent" element={<AgentPage />} />
        <Route path="/questions-ouvertes" element={<VerbatimsPage />} />
        <Route path="/questions-ouvertes/:surveyId/:variable" element={<VerbatimsPage />} />
        <Route path="/exportation-avancee" element={<AdvancedExportPage />} />
        <Route path="/sondage/:surveyId" element={<SurveyPage />} />
        <Route path="/sondage/:surveyId/q/:variable" element={<QuestionDashboard />} />
        <Route path="*" element={<Navigate to="/recherche" replace />} />
      </Route>
    </Routes>
  );
}
