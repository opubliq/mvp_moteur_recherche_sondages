import { useNavigate } from "react-router-dom";
import ExplorationView from "../components/ExplorationView";

export default function CorpusPage() {
  const navigate = useNavigate();
  return <ExplorationView onOpenSurvey={(id) => navigate(`/sondage/${id}`)} />;
}
