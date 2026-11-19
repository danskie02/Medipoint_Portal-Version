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

  const TEMP_INDICATIONS = Object.freeze({
    NORMAL: {
      label: 'Normal',
      indication: 'a normal body temperature',
      severity: 'normal',
      guidance: 'Temperature is within the expected range.',
    },
    'LOW-GRADE FEVER': {
      label: 'Low-Grade Fever',
      indication: 'a low-grade fever',
      severity: 'warning',
      guidance: 'Rest, stay hydrated, and recheck temperature if you feel unwell.',
    },
    FEVER: {
      label: 'Fever',
      indication: 'fever',
      severity: 'warning',
      guidance: 'Rest and hydrate. Seek clinic advice if fever persists or worsens.',
    },
    'HIGH FEVER': {
      label: 'High Fever',
      indication: 'a high fever',
      severity: 'critical',
      guidance: 'High fever needs prompt clinical evaluation.',
    },
    HYPOTHERMIA: {
      label: 'Hypothermia',
      indication: 'hypothermia (below-normal body temperature)',
      severity: 'critical',
      guidance: 'Warm up safely and seek urgent medical attention.',
    },
  });

  const BP_INDICATIONS = Object.freeze({
    NORMAL: {
      label: 'Normal',
      indication: 'normal blood pressure',
      severity: 'normal',
      guidance: 'Blood pressure is within the expected range.',
    },
    'LOW BLOOD PRESSURE': {
      label: 'Low Blood Pressure',
      indication: 'low blood pressure (hypotension)',
      severity: 'warning',
      guidance: 'Rise slowly from sitting or lying down and seek help if you feel faint.',
    },
    'HYPERTENSION STAGE 1': {
      label: 'Hypertension Stage 1',
      indication: 'stage 1 hypertension',
      severity: 'warning',
      guidance: 'Repeat after resting and discuss lifestyle measures with clinic staff.',
    },
    'HYPERTENSION STAGE 2': {
      label: 'Hypertension Stage 2',
      indication: 'stage 2 hypertension',
      severity: 'critical',
      guidance: 'Arrange clinical review soon and avoid strenuous activity until evaluated.',
    },
    'HYPERTENSIVE CRISIS': {
      label: 'Hypertensive Crisis',
      indication: 'a hypertensive crisis reading',
      severity: 'critical',
      guidance: 'Seek emergency care immediately, especially with headache, chest pain, or vision changes.',
    },
  });

  const HR_INDICATIONS = Object.freeze({
    NORMAL: {
      label: 'Normal',
      indication: 'a normal resting heart rate',
      severity: 'normal',
      guidance: 'Heart rate is within the expected resting range.',
    },
    'BRADYCARDIA (LOW)': {
      label: 'Bradycardia',
      indication: 'bradycardia (a low heart rate)',
      severity: 'warning',
      guidance: 'Recheck after resting. Seek care if you feel dizzy, weak, or short of breath.',
    },
    'TACHYCARDIA (HIGH)': {
      label: 'Tachycardia',
      indication: 'tachycardia (an elevated heart rate)',
      severity: 'warning',
      guidance: 'Rest and recheck. Seek care if the elevated rate continues or symptoms appear.',
    },
  });

  const OX_INDICATIONS = Object.freeze({
    Normal: {
      label: 'Normal',
      indication: 'normal oxygen saturation',
      severity: 'normal',
      guidance: 'Oxygen saturation is within the expected range.',
    },
    Hypoxemia: {
      label: 'Hypoxemia',
      indication: 'mildly reduced oxygen saturation (hypoxemia)',
      severity: 'warning',
      guidance: 'Recheck the reading and seek clinic advice if low saturation persists.',
    },
    'Severe Hypoxemia': {
      label: 'Severe Hypoxemia',
      indication: 'severely reduced oxygen saturation',
      severity: 'critical',
      guidance: 'Seek emergency care, especially with breathing difficulty or chest discomfort.',
    },
  });

  const RR_INDICATIONS = Object.freeze({
    NORMAL: {
      label: 'Normal',
      indication: 'a normal resting respiratory rate',
      severity: 'normal',
      guidance: 'Respiratory rate is within the expected resting range.',
    },
    'BRADYPNEA (LOW)': {
      label: 'Bradypnea',
      indication: 'bradypnea (a low respiratory rate)',
      severity: 'warning',
      guidance: 'Recheck after resting. Seek care if breathing feels unusually slow or you feel unwell.',
    },
    'TACHYPNEA (HIGH)': {
      label: 'Tachypnea',
      indication: 'tachypnea (an elevated respiratory rate)',
      severity: 'warning',
      guidance: 'Rest and recheck. Seek care if fast breathing continues or you feel short of breath.',
    },
  });

  const BMI_INDICATIONS = Object.freeze({
    UNDERWEIGHT: {
      label: 'Underweight',
      indication: 'an underweight BMI category',
      severity: 'warning',
      guidance: 'Discuss nutrition and healthy weight goals with clinic personnel.',
    },
    'NORMAL WEIGHT': {
      label: 'Normal Weight',
      indication: 'a normal BMI category',
      severity: 'normal',
      guidance: 'BMI is within the commonly used adult reference range.',
    },
    OVERWEIGHT: {
      label: 'Overweight',
      indication: 'an overweight BMI category',
      severity: 'warning',
      guidance: 'Consider balanced meals, portion awareness, and regular activity.',
    },
    OBESE: {
      label: 'Obese',
      indication: 'an obese BMI category',
      severity: 'warning',
      guidance: 'Discuss gradual weight-management support with clinic personnel.',
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
      interpretations: Array.isArray(prediction.interpretations)
        ? prediction.interpretations
        : buildMeasurementFindings(prediction.features || null),
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
      interpretations: embedded.interpretations || null,
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

  function formatNumber(value, digits) {
    const number = Number(value);
    if (!Number.isFinite(number)) return '';
    if (Number.isInteger(number)) return String(number);
    return number.toFixed(digits == null ? 1 : digits);
  }

  function lookupIndication(map, category) {
    if (!category) return null;
    if (map[category]) return map[category];

    const key = Object.keys(map).find(function (item) {
      return item.toLowerCase() === String(category).toLowerCase();
    });
    return key ? map[key] : null;
  }

  function buildFinding(metric, valueLabel, category, indication, severity, guidance) {
    const categoryLabel = indication && indication.label
      ? indication.label
      : String(category || 'Recorded');
    const indicationText = indication && indication.indication
      ? indication.indication
      : String(category || 'a recorded reading');
    const level = (indication && indication.severity) || severity || 'normal';
    const advice = (indication && indication.guidance) || guidance || '';

    return {
      metric: metric,
      value: valueLabel,
      category: category || categoryLabel,
      categoryLabel: categoryLabel,
      indication: indicationText,
      severity: level,
      attention: level !== 'normal',
      guidance: advice,
      text: valueLabel
        ? metric + ' of ' + valueLabel + ' indicates ' + indicationText + '.'
        : metric + ' indicates ' + indicationText + '.',
    };
  }

  function buildMeasurementFindings(features) {
    if (!features || typeof features !== 'object') return [];

    const findings = [];

    if (features.temp_c != null && features.temp_category) {
      findings.push(buildFinding(
        'Body Temperature',
        formatNumber(features.temp_c, 1) + ' °C',
        features.temp_category,
        lookupIndication(TEMP_INDICATIONS, features.temp_category)
      ));
    }

    if (
      (features.SYS_BP != null || features.DIA_BP != null) &&
      features.bp_category
    ) {
      const systolic = formatNumber(features.SYS_BP, 0);
      const diastolic = formatNumber(features.DIA_BP, 0);
      const valueLabel = systolic && diastolic
        ? systolic + '/' + diastolic + ' mmHg'
        : '';
      findings.push(buildFinding(
        'Blood Pressure',
        valueLabel,
        features.bp_category,
        lookupIndication(BP_INDICATIONS, features.bp_category)
      ));
    }

    if (features.heart_rate != null && features.hr_category) {
      findings.push(buildFinding(
        'Heart Rate',
        formatNumber(features.heart_rate, 0) + ' bpm',
        features.hr_category,
        lookupIndication(HR_INDICATIONS, features.hr_category)
      ));
    }

    if (features.spo2 != null && features.ox_category) {
      findings.push(buildFinding(
        'Oxygen Saturation',
        formatNumber(features.spo2, 0) + '%',
        features.ox_category,
        lookupIndication(OX_INDICATIONS, features.ox_category)
      ));
    }

    if (features.resp_rate != null && features.rr_category) {
      findings.push(buildFinding(
        'Respiratory Rate',
        formatNumber(features.resp_rate, 0) + ' breaths/min',
        features.rr_category,
        lookupIndication(RR_INDICATIONS, features.rr_category)
      ));
    }

    if (features.BMI != null && features.bmi_category) {
      findings.push(buildFinding(
        'BMI',
        formatNumber(features.BMI, 1),
        features.bmi_category,
        lookupIndication(BMI_INDICATIONS, features.bmi_category)
      ));
    }

    return findings;
  }

  function normalizeInterpretation(item) {
    if (!item || typeof item !== 'object') return null;

    const metric = String(item.metric || 'Measurement');
    const value = item.value ? String(item.value) : '';
    const category = String(item.category || item.categoryLabel || 'Recorded');
    const categoryLabel = String(item.categoryLabel || category);
    const indication = String(item.indication || categoryLabel.toLowerCase());
    const severity = item.severity || (String(category).toUpperCase().indexOf('NORMAL') >= 0 ? 'normal' : 'warning');
    const text = item.text
      ? String(item.text)
      : (value
        ? metric + ' of ' + value + ' indicates ' + indication + '.'
        : metric + ' indicates ' + indication + '.');

    return {
      metric: metric,
      value: value,
      category: category,
      categoryLabel: categoryLabel,
      indication: indication,
      severity: severity,
      attention: severity !== 'normal' && String(category).toUpperCase() !== 'NORMAL' && String(category) !== 'Normal' && String(category).toUpperCase() !== 'NORMAL WEIGHT',
      guidance: item.guidance ? String(item.guidance) : '',
      text: text,
    };
  }

  function findingsFromCareMate(caremate) {
    if (!caremate) return [];

    if (Array.isArray(caremate.interpretations) && caremate.interpretations.length) {
      return caremate.interpretations
        .map(normalizeInterpretation)
        .filter(function (item) {
          return !!item;
        });
    }

    return buildMeasurementFindings(caremate.features || null);
  }

  function summarizeFindings(findings) {
    const items = Array.isArray(findings) ? findings : [];
    if (!items.length) {
      return 'CareMate reviewed the recorded vitals.';
    }

    const notable = items.filter(function (item) {
      return item.attention;
    });

    if (!notable.length) {
      return 'All categorized vitals are within expected ranges.';
    }

    const labels = notable.map(function (item) {
      return item.categoryLabel;
    });

    if (labels.length === 1) {
      return 'Key finding: ' + labels[0] + '.';
    }

    return 'Key findings: ' + labels.slice(0, -1).join(', ') + ', and ' + labels[labels.length - 1] + '.';
  }

  function recommendationBullets(recommendation, caremate) {
    const copy = getRecommendationCopy(recommendation);
    const findings = findingsFromCareMate(caremate || { recommendation: recommendation });
    const bullets = [];

    bullets.push(copy.summary);

    const notableFindings = findings.filter(function (item) {
      return item.attention;
    });

    notableFindings.slice(0, 3).forEach(function (item) {
      bullets.push(item.text + (item.guidance ? ' ' + item.guidance : ''));
    });

    if (recommendation === 'EMERGENCY_CARE') {
      bullets.push('Do not delay if you feel severely unwell, faint, or have chest pain or breathing difficulty.');
      bullets.push('Inform clinic personnel or emergency responders about your kiosk readings.');
    } else if (recommendation === 'URGENT_MEDICAL') {
      bullets.push('Bring this assessment summary when you visit the clinic.');
      bullets.push('Rest and avoid strenuous activity until you are evaluated.');
    } else if (recommendation === 'LIFESTYLE_AND_MONITOR') {
      if (!notableFindings.length) {
        bullets.push('Repeat the kiosk assessment after resting if any reading looked unusual.');
      }
      bullets.push('Follow general wellness guidance and seek help if symptoms worsen.');
    } else {
      if (!notableFindings.length) {
        bullets.push('Stay active, hydrated, and well rested.');
      }
      bullets.push('Continue routine monitoring through the kiosk when available.');
    }

    return bullets.filter(function (item, index, list) {
      return item && list.indexOf(item) === index;
    });
  }

  function analysisSummary(caremate) {
    if (!caremate || !caremate.recommendation) {
      return 'Complete a kiosk assessment to generate CareMate analysis.';
    }

    const copy = getRecommendationCopy(caremate.recommendation);
    const findingsSummary = summarizeFindings(findingsFromCareMate(caremate));
    return copy.summary + ' ' + findingsSummary;
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
    buildMeasurementFindings,
    findingsFromCareMate,
    summarizeFindings,
    analysisSummary,
    predictFromAssessment,
  };
})();
