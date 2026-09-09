const axios = require('axios');

function buildJiraUrl(config) {
  let host = config.host;
  let protocol = 'https';

  if (host.includes('://')) {
    const parts = host.split('://');
    protocol = parts[0];
    host = parts[1];
  }

  host = host.replace(/\/$/, '');
  return { protocol, host };
}

function getApiVersion(host) {
  // Atlassian Cloud uses API v3, self-hosted uses v2
  return host.includes('atlassian.net') ? '3' : '2';
}

async function makeJiraRequest(config, path, method = 'POST', data = null) {
  const { protocol, host } = buildJiraUrl(config);
  const auth = Buffer.from(`${config.username}:${config.apiToken}`).toString('base64');
  const baseUrl = `${protocol}://${host}`;

  console.log(`[Jira] ${method} ${baseUrl}${path}`);

  try {
    const response = await axios({
      method: method,
      url: `${baseUrl}${path}`,
      data: data,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'ContentComparator/1.0'
      },
      timeout: 20000
    });

    console.log(`[Jira] Response status: ${response.status}`);
    return response.data;
  } catch (error) {
    console.error(`[Jira] Error:`, error.message);
    if (error.response) {
      const errorMsg = error.response.data?.errorMessages?.[0] ||
                       error.response.data?.message ||
                       `HTTP ${error.response.status}`;
      throw new Error(`Jira error: ${errorMsg}`);
    } else if (error.code === 'ECONNABORTED') {
      throw new Error('Jira connection timeout');
    } else {
      throw new Error(`Connection failed: ${error.message}`);
    }
  }
}

async function createTicket(jiraConfig, ticketData) {
  try {
    const { host } = buildJiraUrl(jiraConfig);
    const apiVersion = getApiVersion(host);

    // Format description based on API version
    let descriptionField = ticketData.description;
    if (apiVersion === '3') {
      // Atlassian Cloud (API v3) uses ADF format
      descriptionField = {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: ticketData.description
              }
            ]
          }
        ]
      };
    }

    const issue = {
      fields: {
        project: { key: ticketData.projectKey },
        summary: ticketData.summary,
        description: descriptionField,
        issuetype: { name: ticketData.issueType || 'Task' },
        labels: ticketData.labels || []
      }
    };

    if (ticketData.assignee) {
      issue.fields.assignee = { name: ticketData.assignee };
    }

    const apiPath = apiVersion === '3' ? '/rest/api/3/issues' : '/rest/api/2/issue';
    const result = await makeJiraRequest(jiraConfig, apiPath, 'POST', issue);

    const { protocol } = buildJiraUrl(jiraConfig);
    return {
      success: true,
      ticketKey: result.key,
      ticketId: result.id,
      link: `${protocol}://${host}/browse/${result.key}`
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
  createTicket,
  formatMissingKeysForJira
};
