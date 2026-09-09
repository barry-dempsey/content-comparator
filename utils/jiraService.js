const JiraClient = require('jira-client');

function createJiraClient(config) {
  return new JiraClient({
    protocol: config.protocol || 'https',
    host: config.host,
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

    const result = await jira.addNewIssue(issue);
    return {
      success: true,
      ticketKey: result.key,
      ticketId: result.id,
      link: `${jiraConfig.protocol || 'https'}://${jiraConfig.host}/browse/${result.key}`
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
