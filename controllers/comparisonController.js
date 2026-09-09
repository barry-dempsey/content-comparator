const {
  compareLanguages,
  batchCompare,
  generateReport,
  generateCSV,
  generateBatchReport
} = require('../utils/comparator');
const { createTicket, formatMissingKeysForJira } = require('../utils/jiraService');

function parseJSONFile(fileBuffer) {
  try {
    return JSON.parse(fileBuffer.toString());
  } catch (error) {
    throw new Error(`Invalid JSON: ${error.message}`);
  }
}

exports.compareSingle = (req, res) => {
  try {
    const { sourceJSON, targetJSON, format = 'json', targetLanguageName = 'Target', keywords } = req.body;

    if (!sourceJSON || !targetJSON) {
      return res.status(400).json({ error: 'Both sourceJSON and targetJSON are required' });
    }

    let sourceData, targetData;
    try {
      sourceData = typeof sourceJSON === 'string' ? JSON.parse(sourceJSON) : sourceJSON;
      targetData = typeof targetJSON === 'string' ? JSON.parse(targetJSON) : targetJSON;
    } catch (error) {
      return res.status(400).json({ error: `Invalid JSON: ${error.message}` });
    }

    const keywordArray = keywords ? (Array.isArray(keywords) ? keywords : keywords.split(',').map(k => k.trim())) : [];
    const comparison = compareLanguages(sourceData, targetData, keywordArray);

    if (format === 'report') {
      const report = generateReport(sourceData, targetData, targetLanguageName, keywordArray);
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="comparison-report-${Date.now()}.txt"`);
      return res.send(report);
    }

    if (format === 'csv') {
      const csv = generateCSV(sourceData, targetData, targetLanguageName);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="comparison-${Date.now()}.csv"`);
      return res.send(csv);
    }

    res.json(comparison);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.compareFiles = (req, res) => {
  try {
    if (!req.files || !req.files.sourceFile || !req.files.targetFile) {
      return res.status(400).json({ error: 'Both sourceFile and targetFile are required' });
    }

    const sourceData = parseJSONFile(req.files.sourceFile.data);
    const targetData = parseJSONFile(req.files.targetFile.data);
    const format = req.body.format || 'json';
    const targetLanguageName = req.body.targetLanguageName || 'Target';
    const keywords = req.body.keywords;

    const keywordArray = keywords ? (Array.isArray(keywords) ? keywords : keywords.split(',').map(k => k.trim())) : [];
    const comparison = compareLanguages(sourceData, targetData, keywordArray);

    if (format === 'report') {
      const report = generateReport(sourceData, targetData, targetLanguageName, keywordArray);
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="comparison-report-${Date.now()}.txt"`);
      return res.send(report);
    }

    if (format === 'csv') {
      const csv = generateCSV(sourceData, targetData, targetLanguageName);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="comparison-${Date.now()}.csv"`);
      return res.send(csv);
    }

    res.json(comparison);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.batchCompareJSON = (req, res) => {
  try {
    const { sourceJSON, targetLanguages, format = 'json', keywords } = req.body;

    if (!sourceJSON || !targetLanguages || Object.keys(targetLanguages).length === 0) {
      return res.status(400).json({
        error: 'sourceJSON and targetLanguages object are required. targetLanguages must have at least one language'
      });
    }

    let sourceData;
    try {
      sourceData = typeof sourceJSON === 'string' ? JSON.parse(sourceJSON) : sourceJSON;
    } catch (error) {
      return res.status(400).json({ error: `Invalid source JSON: ${error.message}` });
    }

    const parsedTargets = {};
    for (const [langName, langJSON] of Object.entries(targetLanguages)) {
      try {
        parsedTargets[langName] = typeof langJSON === 'string' ? JSON.parse(langJSON) : langJSON;
      } catch (error) {
        return res.status(400).json({ error: `Invalid JSON for ${langName}: ${error.message}` });
      }
    }

    const keywordArray = keywords ? (Array.isArray(keywords) ? keywords : keywords.split(',').map(k => k.trim())) : [];

    if (format === 'report') {
      const report = generateBatchReport(sourceData, parsedTargets, keywordArray);
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="batch-report-${Date.now()}.txt"`);
      return res.send(report);
    }

    const results = batchCompare(sourceData, parsedTargets, keywordArray);
    res.json(results);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.batchCompareFiles = (req, res) => {
  try {
    if (!req.files || !req.files.sourceFile || !req.files.targetFiles) {
      return res.status(400).json({
        error: 'sourceFile and targetFiles are required'
      });
    }

    const sourceData = parseJSONFile(req.files.sourceFile.data);
    const format = req.body.format || 'json';
    const keywords = req.body.keywords;

    const targetFiles = Array.isArray(req.files.targetFiles)
      ? req.files.targetFiles
      : [req.files.targetFiles];

    const parsedTargets = {};
    targetFiles.forEach(file => {
      const langName = file.name.replace(/\.json$/i, '');
      try {
        parsedTargets[langName] = parseJSONFile(file.data);
      } catch (error) {
        parsedTargets[langName] = { error: error.message };
      }
    });

    const keywordArray = keywords ? (Array.isArray(keywords) ? keywords : keywords.split(',').map(k => k.trim())) : [];

    if (format === 'report') {
      const report = generateBatchReport(sourceData, parsedTargets, keywordArray);
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="batch-report-${Date.now()}.txt"`);
      return res.send(report);
    }

    const results = batchCompare(sourceData, parsedTargets, keywordArray);
    res.json(results);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.createJiraTicket = async (req, res) => {
  try {
    let { jiraConfig, missingKeys, sourceData, targetLanguageName, projectKey, summary } = req.body;

    if (!missingKeys || !sourceData) {
      return res.status(400).json({
        error: 'missingKeys and sourceData are required'
      });
    }

    // Use environment variables if jiraConfig not provided
    if (!jiraConfig) {
      jiraConfig = {
        host: process.env.JIRA_HOST,
        username: process.env.JIRA_USERNAME,
        apiToken: process.env.JIRA_API_TOKEN,
        projectKey: process.env.JIRA_PROJECT_KEY
      };
    }

    // Override with request projectKey if provided
    if (projectKey) {
      jiraConfig.projectKey = projectKey;
    }

    if (!jiraConfig.host || !jiraConfig.username || !jiraConfig.apiToken || !jiraConfig.projectKey) {
      return res.status(400).json({
        error: 'Jira configuration missing. Set environment variables (JIRA_HOST, JIRA_USERNAME, JIRA_API_TOKEN, JIRA_PROJECT_KEY) or provide jiraConfig in request'
      });
    }

    const description = formatMissingKeysForJira(missingKeys, sourceData, targetLanguageName || 'Target');
    const ticketSummary = summary || `Missing translations for ${targetLanguageName || 'Target'} (${missingKeys.length} keys)`;

    const ticket = await createTicket(jiraConfig, {
      projectKey,
      summary: ticketSummary,
      description,
      issueType: 'Task',
      labels: ['localization', 'missing-keys']
    });

    res.json(ticket);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
