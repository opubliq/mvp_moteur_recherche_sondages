import { useParams } from "react-router-dom";
import SurveyDetail from "../components/SurveyDetail";

export default function SurveyPage() {
  const { surveyId } = useParams<{ surveyId: string }>();
  if (!surveyId) return <p>Sondage introuvable.</p>;
  return <SurveyDetail surveyId={surveyId} />;
}
