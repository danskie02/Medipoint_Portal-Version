/**
 * Shared CareMate prediction helper for Supabase Edge Functions.
 */

export function stripCareMateResults(results) {
  if (!Array.isArray(results)) return [];
  return results.filter((result) => result?.type !== 'caremate' && result?.title !== '__caremate__');
}

export function buildCareMateResult(prediction) {
  if (!prediction?.recommendation) return null;

  return {
    type: 'caremate',
    title: '__caremate__',
    recommendation: prediction.recommendation,
    probabilities: prediction.probabilities || {},
    features: prediction.features || null,
    generatedAt: new Date().toISOString(),
  };
}

export async function requestCareMatePrediction(payload) {
  const baseUrl = String(Deno.env.get('CAREMATE_API_URL') || '').replace(/\/$/, '');
  if (!baseUrl) return null;

  const response = await fetch(`${baseUrl}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.warn('[CareMate] Prediction failed:', data.detail || data.error || response.status);
    return null;
  }

  return data;
}
