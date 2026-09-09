function filterKeysByKeywords(keys, keywords) {
  if (!keywords || keywords.length === 0) {
    return keys;
  }
  return keys.filter(key =>
    keywords.some(keyword => key.toLowerCase().includes(keyword.toLowerCase()))
  );
}

function compareLanguages(sourceData, targetData, keywords = []) {
  if (typeof sourceData !== 'object' || sourceData === null) {
    throw new Error('Source data must be a valid JSON object');
  }
  if (typeof targetData !== 'object' || targetData === null) {
    throw new Error('Target data must be a valid JSON object');
  }

  const sourceKeys = Object.keys(sourceData).filter(key => !key.startsWith('dynamic_messages_'));
  const targetKeys = new Set(Object.keys(targetData).filter(key => !key.startsWith('dynamic_messages_')));

  let missingKeys = sourceKeys.filter(key => !targetKeys.has(key));
  missingKeys = filterKeysByKeywords(missingKeys, keywords);

  const translatedCount = sourceKeys.length - sourceKeys.filter(key => !targetKeys.has(key)).length;
  const completionPercent = sourceKeys.length > 0
    ? Math.round((translatedCount / sourceKeys.length) * 100)
    : 0;

  return {
    totalKeys: sourceKeys.length,
    translatedKeys: translatedCount,
    missingKeys: missingKeys,
    missingKeysCount: missingKeys.length,
    completionPercent: completionPercent,
    allKeysPresent: missingKeys.length === 0
  };
}

function batchCompare(sourceData, targetLanguages, keywords = []) {
  const results = {};

  for (const [languageName, languageData] of Object.entries(targetLanguages)) {
    try {
      results[languageName] = compareLanguages(sourceData, languageData, keywords);
    } catch (error) {
      results[languageName] = {
        error: error.message
      };
    }
  }

  return results;
}

function generateReport(sourceData, targetData, targetLanguageName = 'Target', keywords = []) {
  const comparison = compareLanguages(sourceData, targetData, keywords);

  let report = `LOCALIZATION COMPARISON REPORT\n`;
  report += `Generated: ${new Date().toISOString()}\n`;
  report += `Target Language: ${targetLanguageName}\n`;
  report += `${'='.repeat(50)}\n\n`;

  report += `SUMMARY:\n`;
  report += `Total Keys: ${comparison.totalKeys}\n`;
  report += `Translated Keys: ${comparison.translatedKeys}\n`;
  report += `Missing Keys: ${comparison.missingKeysCount}\n`;
  report += `Completion: ${comparison.completionPercent}%\n\n`;

  if (comparison.missingKeys.length > 0) {
    report += `MISSING KEYS:\n`;
    report += `${'='.repeat(50)}\n`;
    comparison.missingKeys.forEach((key, index) => {
      report += `${index + 1}. ${key}\n`;
    });
  } else {
    report += `✅ All keys are translated!\n`;
  }

  return report;
}

function generateCSV(sourceData, targetData, targetLanguageName = 'Target') {
  const comparison = compareLanguages(sourceData, targetData);
  const sourceKeys = Object.keys(sourceData).filter(key => !key.startsWith('dynamic_messages_'));
  const targetKeys = new Set(Object.keys(targetData).filter(key => !key.startsWith('dynamic_messages_')));

  let csv = `Key,Source Value,Status\n`;

  sourceKeys.forEach(key => {
    const isTranslated = targetKeys.has(key);
    const status = isTranslated ? 'Translated' : 'Missing';
    const sourceValue = JSON.stringify(sourceData[key]).replace(/"/g, '""');
    csv += `"${key}","${sourceValue}","${status}"\n`;
  });

  return csv;
}

function generateBatchReport(sourceData, targetLanguages, keywords = []) {
  const batchResults = batchCompare(sourceData, targetLanguages, keywords);

  let report = `BATCH LOCALIZATION COMPARISON REPORT\n`;
  report += `Generated: ${new Date().toISOString()}\n`;
  report += `${'='.repeat(60)}\n\n`;

  report += `OVERVIEW:\n`;
  report += `Total Languages Compared: ${Object.keys(targetLanguages).length}\n`;
  report += `Source Keys: ${Object.keys(sourceData).length}\n\n`;

  report += `LANGUAGE SUMMARY:\n`;
  report += `${'='.repeat(60)}\n`;
  report += `Language | Translated | Missing | Completion\n`;
  report += `${'='.repeat(60)}\n`;

  const languages = Object.entries(batchResults);
  languages.forEach(([langName, result]) => {
    if (!result.error) {
      const padding = ' '.repeat(Math.max(0, 10 - langName.length));
      const transLang = result.translatedKeys.toString().padStart(12);
      const missingLang = result.missingKeysCount.toString().padStart(8);
      const completionLang = `${result.completionPercent}%`.padStart(12);
      report += `${langName}${padding}|${transLang}|${missingLang}|${completionLang}\n`;
    } else {
      report += `${langName} | ERROR: ${result.error}\n`;
    }
  });

  report += `\n${'='.repeat(60)}\n`;
  report += `DETAILED ANALYSIS:\n`;
  report += `${'='.repeat(60)}\n\n`;

  languages.forEach(([langName, result]) => {
    report += `${langName}:\n`;
    report += `${'-'.repeat(40)}\n`;
    if (result.error) {
      report += `ERROR: ${result.error}\n`;
    } else {
      report += `Total: ${result.totalKeys} | Translated: ${result.translatedKeys} | Missing: ${result.missingKeysCount} | Completion: ${result.completionPercent}%\n\n`;
      if (result.missingKeys.length > 0) {
        report += `Missing Keys:\n`;
        result.missingKeys.forEach((key, index) => {
          report += `  ${index + 1}. ${key}\n`;
        });
      } else {
        report += `✅ All keys are translated!\n`;
      }
    }
    report += `\n`;
  });

  return report;
}

module.exports = {
  compareLanguages,
  batchCompare,
  generateReport,
  generateCSV,
  generateBatchReport
};
