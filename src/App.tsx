import { Navigate, Route, Routes } from "react-router-dom";
import AppShell from "./components/AppShell";
import SearchPage from "./pages/SearchPage";
import CorpusPage from "./pages/CorpusPage";
import AgentPage from "./pages/AgentPage";
import VerbatimsPage from "./pages/VerbatimsPage";
import SurveyPage from "./pages/SurveyPage";
import QuestionDashboard from "./components/QuestionDashboard";

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/recherche" replace />} />
        <Route path="/recherche" element={<SearchPage />} />
        <Route path="/corpus" element={<CorpusPage />} />
        <Route path="/agent" element={<AgentPage />} />
        <Route path="/verbatims" element={<VerbatimsPage />} />
        <Route path="/sondage/:surveyId" element={<SurveyPage />} />
        <Route path="/sondage/:surveyId/q/:variable" element={<QuestionDashboard />} />
        <Route path="*" element={<Navigate to="/recherche" replace />} />
      </Route>
    </Routes>
  );
}
