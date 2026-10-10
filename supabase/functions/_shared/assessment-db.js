/**
 * Helpers for the normalized assessments / assessment_results schema.
 */

function normalizeMeasurementStatus(status) {
  const text = String(status || '').trim().toLowerCase();

  if (text.includes('normal')) {
    return 'Normal';
  }

  if (
    text.includes('attention') ||
    text.includes('warning') ||
    text.includes('elevated') ||
    text.includes('high') ||
    text.includes('low')
  ) {
    return 'Needs Attention';
  }

  return 'Recorded';
}

function parseNumericValue(title, value) {
  const text = String(value || '');
  const titleText = String(title || '').toLowerCase();

  if (titleText.includes('blood pressure')) {
    const parts = text.split('/');
    return {
      numeric_value: parts[0] ? Number.parseFloat(parts[0]) || null : null,
      numeric_value_secondary: parts[1] ? Number.parseFloat(parts[1]) || null : null,
    };
  }

  const match = text.match(/([\d.]+)/);
  const numeric = match ? Number.parseFloat(match[1]) : null;

  return {
    numeric_value: Number.isFinite(numeric) ? numeric : null,
    numeric_value_secondary: null,
  };
}

function isCareMatePayload(result) {
  return result?.type === 'caremate' || result?.title === '__caremate__';
}

export function stripCareMatePayloads(results) {
  if (!Array.isArray(results)) return [];
  return results.filter((result) => !isCareMatePayload(result));
}

export function extractCareMatePayload(results) {
  if (!Array.isArray(results)) return null;

  const item = results.find(isCareMatePayload);
  if (!item?.recommendation) return null;

  return {
    recommendation: item.recommendation,
    probabilities: item.probabilities || {},
    features: item.features || null,
    generatedAt: item.generatedAt || null,
  };
}

export function detectIsSimulated(results) {
  if (!Array.isArray(results) || !results.length) {
    return true;
  }

  const notes = results.map((result) => String(result.note || '').toLowerCase());
  const hasSensorReading = notes.some((note) =>
    note.includes('arduino') || note.includes('sensor') || note.includes('measured from')
  );

  return !hasSensorReading;
}

export function normalizeUuid(value) {
  const text = String(value || '').trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text)
    ? text
    : null;
}

export function buildAssessmentInsertPayload({
  profileId,
  kioskId,
  program,
  results,
  assessedAt,
}) {
  return {
    profile_id: profileId,
    kiosk_id: normalizeUuid(kioskId),
    program_snapshot: program || null,
    is_simulated: detectIsSimulated(results),
    assessed_at: assessedAt || new Date().toISOString(),
  };
}
export function buildAssessmentResultRows(assessmentId, results) {
  return stripCareMatePayloads(results).map((result, index) => {
    const numerics = parseNumericValue(result.title, result.value);

    return {
      assessment_id: assessmentId,
      title: String(result.title || 'Measurement'),
      value: String(result.value ?? ''),
      unit: result.unit ? String(result.unit) : null,
      status: normalizeMeasurementStatus(result.status),
      note: result.note ? String(result.note) : null,
      numeric_value: numerics.numeric_value,
      numeric_value_secondary: numerics.numeric_value_secondary,
      metadata: {
        display_status: String(result.status || 'Recorded'),
      },
      sort_order: index,
    };
  });
}

export function buildCareMateResultRow(assessmentId, caremate, sortOrder) {
  if (!caremate?.recommendation) return null;

  return {
    assessment_id: assessmentId,
    title: '__caremate__',
    value: caremate.recommendation,
    unit: 'CareMate',
    status: 'Recorded',
    note: null,
    numeric_value: null,
    numeric_value_secondary: null,
    metadata: {
      type: 'caremate',
      recommendation: caremate.recommendation,
      probabilities: caremate.probabilities || {},
      features: caremate.features || null,
      generatedAt: caremate.generatedAt || new Date().toISOString(),
    },
    sort_order: sortOrder,
  };
}

export function mapAssessmentRows(assessment, resultRows, profile = null) {
  const rows = Array.isArray(resultRows) ? resultRows : [];
  const caremateRow = rows.find((row) =>
    row?.title === '__caremate__' || row?.metadata?.type === 'caremate'
  );

  const vitals = rows
    .filter((row) => row?.title !== '__caremate__' && row?.metadata?.type !== 'caremate')
    .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
    .map((row) => ({
      title: row.title,
      value: row.value,
      unit: row.unit || '',
      status: row.metadata?.display_status || row.status || 'Recorded',
      note: row.note || '',
    }));

  const caremateFromRow = caremateRow
    ? {
      recommendation: caremateRow.metadata?.recommendation || caremateRow.value,
      probabilities: caremateRow.metadata?.probabilities || {},
      features: caremateRow.metadata?.features || null,
      generatedAt: caremateRow.metadata?.generatedAt || caremateRow.created_at || null,
    }
    : null;

  const profileProgram = profile?.program || profile?.department_office || '';

  return {
    date: assessment.assessed_at || assessment.created_at || new Date().toISOString(),
    results: vitals,
    caremate: caremateFromRow,
    isSimulated: Boolean(assessment.is_simulated),
    userId: assessment.profile_id,
    user: profile?.full_name || '',
    program: assessment.program_snapshot || profileProgram || '',
  };
}
