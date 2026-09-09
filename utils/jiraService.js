const JiraClient = require('jira-client');

function createJiraClient(config) {
  // Strip protocol from host if included
  let host = config.host;
  let protocol = 'https';

  if (host.includes('://')) {
    const parts = host.split('://');
    protocol = parts[0];
    host = parts[1];
  }

  // Remove trailing slash
  host = host.replace(/\/$/, '');

  return new JiraClient({
    protocol: config.protocol || protocol,
    host: host,
    username: config.username,
    password: config.apiToken,
    apiVersion: '2',
    strictSSL: true
  });
}

async function createTicket(jiraConfig, ticketData) {
  try {
    const jira = createJiraClient(jiraConfig);

    const issue = {
      fields: {
        project: { key: ticketData.projectKey },
        summary: ticketData.summary,
        description: ticketData.description,
        issuetype: { name: ticketData.issueType || 'Task' },
        assignee: ticketData.assignee ? { name: ticketData.assignee } : undefined,
        labels: ticketData.labels || []
      }
    };

    // Add timeout to request
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Jira connection timeout (30s)')), 30000)
    );

    const result = await Promise.race([
      jira.addNewIssue(issue),
      timeoutPromise
    ]);

    // Build link with clean host
    let host = jiraConfig.host;
    if (host.includes('://')) {
      host = host.split('://')[1];
    }
    host = host.replace(/\/$/, '');

    return {
      success: true,
      ticketKey: result.key,
      ticketId: result.id,
      link: `https://${host}/browse/${result.key}`
    };
  } catch (error) {
    throw new Error(`Failed to create Jira ticket: ${error.message}`);
  }
}

function formatMissingKeysForJira(missingKeys, sourceData, targetLanguageName, sourceLanguageName = 'English') {
  const keyDetails = missingKeys.map(key => {
    const value = sourceData[key];
    return `- *${key}*: "${value}"`;
  }).join('\n');

  return `h3. Missing Keys in ${targetLanguageName}
Source Language: ${sourceLanguageName}

*Total Missing:* ${missingKeys.length}

h4. Keys:
${keyDetails}

h5. Action Items:
- [ ] Review missing keys
- [ ] Provide translations
- [ ] Verify completeness`;
}

module.exports = {
  createJiraClient,
  createTicket,
  formatMissingKeysForJira
};
