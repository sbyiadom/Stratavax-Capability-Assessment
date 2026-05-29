// pages/admin/manage-candidates.js - FULL FIXED VERSION (CORRECT REPORT LINK)

import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import AppLayout from "../../components/AppLayout";
import { supabase } from "../../supabase/client";

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function toNumber(value, fallback = 0) {
  const numberValue = Number(value);
  if (Number.isNaN(numberValue) || !Number.isFinite(numberValue)) return fallback;
  return numberValue;
}

function cleanText(value, fallback = "") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function formatDate(value) {
  if (!value) return "N/A";
  try {
    return new Date(value).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  } catch (error) {
    return "N/A";
  }
}

function getPercentage(result) {
  if (!result) return 0;
  if (result.percentage_score !== null && result.percentage_score !== undefined) {
    return Math.round(toNumber(result.percentage_score, 0));
  }
  const score = toNumber(result.total_score, 0);
  const maxScore = toNumber(result.max_score, 0);
  if (maxScore <= 0) return 0;
  return Math.round((score / maxScore) * 100);
}

export default function ManageCandidates() {
  const router = useRouter();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCandidates();
  }, []);

  async function fetchCandidates() {
    try {
      setLoading(true);

      const { data: candidatesData } = await supabase
        .from("candidate_profiles")
        .select("*")
        .order("created_at", { ascending: false });

      const { data: results } = await supabase
        .from("assessment_results")
        .select("*")
        .order("completed_at", { ascending: false });

      const resultsByUser = {};
      safeArray(results).forEach((r) => {
        if (!resultsByUser[r.user_id]) resultsByUser[r.user_id] = [];
        resultsByUser[r.user_id].push(r);
      });

      const enriched = safeArray(candidatesData).map((c) => ({
        ...c,
        results: resultsByUser[c.id] || [],
        latestResult: (resultsByUser[c.id] || [])[0] || null
      }));

      setCandidates(enriched);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div>Loading...</div>;

  return (
    <AppLayout>
      <div style={{ padding: 20 }}>
        <h2>Manage Candidates</h2>

        {candidates.map((candidate) => {
          const result = candidate.latestResult;

          // ✅ FIX: use correct user_id and pass assessment_id
          const userId = candidate.id;
          const assessmentId = result?.assessment_id;

          const reportUrl = assessmentId
            ? `/supervisor/${userId}?assessment=${assessmentId}`
            : `/supervisor/${userId}`;

          return (
            <div key={candidate.id} style={{ padding: 10, border: "1px solid #ddd", marginBottom: 10 }}>
              <div><strong>{candidate.full_name || candidate.email}</strong></div>

              <Link href={reportUrl}>
                <a style={{ background: "#0a1929", color: "white", padding: 8, display: "inline-block", marginTop: 6 }}>
                  View Report
                </a>
              </Link>
            </div>
          );
        })}
      </div>
    </AppLayout>
  );
}
