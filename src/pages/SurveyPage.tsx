import { useParams } from "react-router-dom";
import SurveyDetail from "../components/SurveyDetail";
import { useLanguage } from "../context/LanguageContext";

export default function SurveyPage() {
  const { t } = useLanguage();
  const { surveyId } = useParams<{ surveyId: string }>();
  if (!surveyId) return <p>{t("surveyPage.notFound")}</p>;
  return <SurveyDetail surveyId={surveyId} />;
}
