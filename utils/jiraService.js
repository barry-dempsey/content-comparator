const https = require('https');
const http = require('http');

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

async function makeJiraRequest(config, path, method = 'POST', data = null) {
  const { protocol, host } = buildJiraUrl(config);
  const auth = Buffer.from(`${config.username}:${config.apiToken}`).toString('base64');

  return new Promise((resolve, reject) => {
    const options = {
      hostname: host,
      path: path,
      method: method,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 15000
    };

    const client = protocol === 'http' ? http : https;

    const req = client.request(options, (res) => {
      let responseData = '';

      res.on('data', chunk => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          if (res.statusCode >= 400) {
            reject(new Error(`Jira error (${res.statusCode}): ${parsed.errorMessages?.[0] || parsed.message || 'Unknown error'}`));
          } else {
            resolve(parsed);
          }
        } catch (e) {
          reject(new Error(`Failed to parse Jira response: ${responseData.substring(0, 100)}`));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Jira connection timeout'));
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function createTicket(jiraConfig, ticketData) {
  try {
    const issue = {
      fields: {
        project: { key: ticketData.projectKey },
        summary: ticketData.summary,
        description: ticketData.description,
        issuetype: { name: ticketData.issueType || 'Task' },
        labels: ticketData.labels || []
      }
    };

    if (ticketData.assignee) {
      issue.fields.assignee = { name: ticketData.assignee };
    }

    const result = await makeJiraRequest(jiraConfig, '/rest/api/2/issue', 'POST', issue);

    const { protocol, host } = buildJiraUrl(jiraConfig);
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
