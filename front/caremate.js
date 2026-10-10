(function () {
  'use strict';

  const CAREMATE_MARKER = '__caremate__';

  const RECOMMENDATION_COPY = Object.freeze({
    EMERGENCY_CARE: {
      label: 'Emergency Care Required',
      summary: 'Seek emergency medical care immediately or call emergency services.',
      severity: 'critical',
    },
    URGENT_MEDICAL: {
      label: 'Urgent Medical Attention',
      summary: 'Visit clinic personnel or a healthcare provider as soon as possible.',
      severity: 'critical',
    },
    LIFESTYLE_AND_MONITOR: {
      label: 'Lifestyle Changes and Monitoring',
      summary: 'Adopt healthier habits and monitor your vitals. Consult clinic staff if symptoms persist.',
      severity: 'warning',
    },
    MAINTAIN_HEALTHY: {
      label: 'Maintain Healthy Lifestyle',
      summary: 'Your recorded vitals suggest continuing your current healthy routines.',
      severity: 'normal',
    },
  });

  function getApiUrl() {
    return String(window.MEDIPOINT_CAREMATE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
  }

  function isCareMateResult(result) {
    if (!result || typeof result !== 'object') return false;
    return result.type === 'caremate' || result.title === CAREMATE_MARKER;
  }

  function stripCareMateResults(results) {
    return (Array.isArray(results) ? results : []).filter(function (result) {
      return !isCareMateResult(result);
    });
  }

  function buildCareMateResult(prediction) {
    if (!prediction || !prediction.recommendation) return null;

    return {
      type: 'caremate',
      title: CAREMATE_MARKER,
      recommendation: prediction.recommendation,
      probabilities: prediction.probabilities || {},
      features: prediction.features || null,
      generatedAt: new Date().toISOString(),
    };
  }

  function extractCareMateFromAssessment(assessment) {
    if (!assessment) return null;
    if (assessment.caremate && assessment.caremate.recommendation) {
      return assessment.caremate;
    }

    const embedded = (Array.isArray(assessment.results) ? assessment.results : []).find(isCareMateResult);
    if (!embedded) return null;

    return {
      recommendation: embedded.recommendation,
      probabilities: embedded.probabilities || {},
      features: embedded.features || null,
      generatedAt: embedded.generatedAt || null,
    };
  }

  function getRecommendationCopy(recommendation) {
    return RECOMMENDATION_COPY[recommendation] || {
      label: String(recommendation || 'CareMate Recommendation'),
      summary: 'Review your assessment with qualified clinic personnel.',
      severity: 'warning',
    };
  }

  function recommendationBullets(recommendation) {
    const copy = getRecommendationCopy(recommendation);

    if (recommendation === 'EMERGENCY_CARE') {
      return [
        copy.summary,
        'Do not delay if you feel severely unwell, faint, or have chest pain or breathing difficulty.',
        'Inform clinic personnel or emergency responders about your kiosk readings.',
      ];
    }

    if (recommendation === 'URGENT_MEDICAL') {
      return [
        copy.summary,
        'Bring this assessment summary when you visit the clinic.',
        'Rest and avoid strenuous activity until you are evaluated.',
      ];
    }

    if (recommendation === 'LIFESTYLE_AND_MONITOR') {
      return [
        copy.summary,
        'Repeat the kiosk assessment after resting if any reading looked unusual.',
        'Follow general wellness guidance and seek help if symptoms worsen.',
      ];
    }

    return [
      copy.summary,
      'Stay active, hydrated, and well rested.',
      'Continue routine monitoring through the kiosk when available.',
    ];
  }

  async function predictFromAssessment(results, profile) {
    const apiUrl = getApiUrl();
    if (!apiUrl) return null;

    const response = await fetch(`${apiUrl}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        results: stripCareMateResults(results),
        birthday: profile && profile.birthday ? profile.birthday : '',
        gender: profile && profile.gender ? profile.gender : '',
        age: profile && profile.age ? profile.age : null,
      }),
    });

    const data = await response.json().catch(function () {
      return {};
    });

    if (!response.ok) {
      throw new Error(data.detail || data.error || 'CareMate prediction failed.');
    }

    return data;
  }

  window.MediPointCareMate = {
    CAREMATE_MARKER,
    RECOMMENDATION_COPY,
    getApiUrl,
    isCareMateResult,
    stripCareMateResults,
    buildCareMateResult,
    extractCareMateFromAssessment,
    getRecommendationCopy,
    recommendationBullets,
    predictFromAssessment,
  };
})();
