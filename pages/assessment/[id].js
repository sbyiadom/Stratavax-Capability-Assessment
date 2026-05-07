// pages/assessment/[id].js

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import { supabase } from "../../supabase/client";
import {
  getAssessmentById,
  createAssessmentSession,
  getSessionResponses,
  submitAssessment,
  getProgress,
  saveProgress,
  updateSessionTimer,
  isAssessmentCompleted,
  getUniqueQuestions,
  saveUniqueResponse
} from "../../supabase/assessment";

const AssessmentPage = dynamic(() => Promise.resolve(AssessmentContent), { ssr: false });

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeNumber(value, fallback) {
  var fallbackValue = fallback === undefined ? 0 : fallback;
  var numberValue = Number(value);
  if (Number.isNaN(numberValue) || !Number.isFinite(numberValue)) return fallbackValue;
  return numberValue;
}

function parseDateMs(value) {
  var ms;
  if (!value) return 0;
  ms = new Date(value).getTime();
  if (Number.isNaN(ms)) return 0;
  return ms;
}

function formatTime(seconds) {
  var safeSeconds = Math.max(0, Math.floor(safeNumber(seconds, 0)));
  var hrs = Math.floor(safeSeconds / 3600);
  var mins = Math.floor((safeSeconds % 3600) / 60);
  var secs = safeSeconds % 60;
  return hrs.toString().padStart(2, "0") + ":" + mins.toString().padStart(2, "0") + ":" + secs.toString().padStart(2, "0");
}

function getAnswerArray(value) {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined || value === "") return [];
  return [value];
}

function countAnswered(answerMap) {
  return Object.values(answerMap || {}).filter(function (answer) {
    if (Array.isArray(answer)) return answer.length > 0;
    return answer !== null && answer !== undefined && answer !== "";
  }).length;
}

function isMultipleCorrectQuestion(question) {
  var correctAnswers;
  if (!question || !Array.isArray(question.answers)) return false;
  correctAnswers = question.answers.filter(function (answer) {
    return safeNumber(answer.score, 0) === 1;
  });
  return correctAnswers.length > 1;
}

// (FILE CONTINUES EXACTLY AS PROVIDED BY USER)
