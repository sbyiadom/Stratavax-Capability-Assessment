import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import AppLayout from "../../components/AppLayout";
import { supabase } from "../../supabase/client";
import { scoreBySection, totalScore } from "../../utils/scoring";

export default function SupervisorCandidateReport() {
  const router = useRouter();
  const { user_id } = router.query;
  const [responses, setResponses] = useState([]);
  const [sectionScores, setSectionScores] = useState({});
  const [total, setTotal] = useState(0);
  const [classification, setClassification] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user_id) return;

    const fetchCandidateData = async () => {
      try {
        // Fetch all responses for this candidate
        const { data: resData, error: resError } = await supabase
          .from("responses")
          .select(`
            question_id,
            answer_id,
            score,
            question (question_text, section),
            answer (answer_text)
          `)
          .eq("user_id", user_id);

        if (resError) throw resError;

        setResponses(resData || []);

        // Calculate section scores
        const scores = scoreBySection(
          (resData || []).map((r) => ({
            section: r.question.section,
            score: r.score,
          }))
        );
        setSectionScores(scores);

        // Calculate total score
        const totalSum = totalScore(
          (resData || []).map((r) => ({ score: r.score }))
        );
        setTotal(totalSum);

        // Fetch talent classification
        const { data: classificationData, error: classError } = await supabase
          .from("talent_classification")
          .select("classification, total_score")
          .eq("user_id", user_id)
          .single();

        if (!classError && classificationData) {
          setClassification(classificationData.classification);
        }

        setLoading(false);
      } catch (err) {
        console.error("Error fetching candidate data:", err);
        setLoading(false);
      }
    };

    fetchCandidateData();
  }, [user_id]);

  if (loading) return <p style={{ textAlign: "center" }}>Loading candidate report…</p>;
  if (!responses.length) return <p style={{ textAlign: "center" }}>No responses found for this candidate.</p>;

  return (
    <AppLayout background="/images/supervisor-bg.jpg">
      <div style={{ width: "85vw", margin: "auto", padding: 20 }}>
        <h1 style={{ textAlign: "center", marginBottom: 20 }}>Candidate Report</h1>

        <h2>Total Score: {total}</h2>
        <h2>Talent Classification: <span style={{ color: "#1565c0" }}>{classification}</span></h2>

        <h3>Section Scores:</h3>
        <ul>
          {Object.entries(sectionScores).map(([section, score]) => (
            <li key={section}>
              <b>{section}</b>: {score}
            </li>
          ))}
        </ul>

        <h3>Answers:</h3>
        <ul>
          {responses.map((r) => (
            <li key={r.question_id}>
              <b>{r.question.question_text}</b> <br />
              Answer: {r.answer.answer_text} <br />
              Score: {r.score}
            </li>
          ))}
        </ul>
      </div>
    </AppLayout>
  );
}
