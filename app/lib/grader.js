/**
 * Mock AI grading engine.
 * Replace this single function with a real AI call when ready.
 *
 * Input:  { filePath, paperTitle }
 * Output: { score, feedback, qBreakdown: [{ got, full }] }
 */
export function gradeSubmission({ filePath, paperTitle }) {
  // Deterministic seed from filePath for consistent results per file
  let seed = 0;
  for (let i = 0; i < filePath.length; i++) {
    seed = ((seed << 5) - seed + filePath.charCodeAt(i)) | 0;
  }
  const rand = (min, max) => {
    seed = (seed * 16807 + 12345) & 0x7fffffff;
    return min + (seed % (max - min + 1));
  };

  const numQuestions = 10;
  const maxPerQ      = 10;
  const breakdown    = [];
  let   total        = 0;

  for (let i = 0; i < numQuestions; i++) {
    const got = rand(4, maxPerQ);
    breakdown.push({ got, full: maxPerQ });
    total += got;
  }

  const score    = Math.round((total / (numQuestions * maxPerQ)) * 100);
  const fullMks  = numQuestions * maxPerQ;

  // Generate contextual feedback based on score
  let feedback;
  if (score >= 90) {
    feedback = `Excellent work on "${paperTitle}". You demonstrated strong command across all questions. Minor deductions were in computation steps — double-check arithmetic in your final pass.`;
  } else if (score >= 75) {
    feedback = `Good performance on "${paperTitle}". Core concepts are solid. Some marks were lost in questions requiring multi-step proofs — ensure you show all intermediate steps clearly.`;
  } else if (score >= 60) {
    feedback = `Fair attempt on "${paperTitle}". Foundational understanding is present but several questions had incomplete solutions. Focus on practicing timed problem-solving to improve coverage.`;
  } else {
    feedback = `"${paperTitle}" needs significant review. Multiple questions were either unanswered or had fundamental errors. Revisit the core theory and practice with worked examples before the next assessment.`;
  }

  return { score, feedback, qBreakdown: breakdown };
}
