const fs = require('fs').promises;
const path = require('path');
const process = require('process');
const {authenticate} = require('@google-cloud/local-auth');
const {google} = require('googleapis');
const readline = require("readline");
const credentials = require("./credentials.json");
//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
// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/gmail.modify', 'https://www.googleapis.com/auth/gmail.compose', 'https://www.googleapis.com/auth/gmail.send'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

/**
 * Reads previously authorized credentials from the save file.
 *
 * @return {Promise<OAuth2Client|null>}
 */
async function loadSavedCredentialsIfExist() {
  try {
    const content = await fs.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

/**
 * Serializes credentials to a file compatible with GoogleAUth.fromJSON.
 *
 * @param {OAuth2Client} client
 * @return {Promise<void>}
 */
async function saveCredentials(client) {
  const content = await fs.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fs.writeFile(TOKEN_PATH, payload);
}

/**
 * Load or request or authorization to call APIs.
 *
 */
async function authorize() {
  let client = await loadSavedCredentialsIfExist();
  if (client) {
    return client;
  }
  client = await authenticate({
    scopes: SCOPES, keyfilePath: CREDENTIALS_PATH,
  });
  if (client.credentials) {
    await saveCredentials(client);
  }
  return client;
}

async function analyzeAndForwardEmails(auth) {
  try {
    const gmail = google.gmail({version: 'v1', auth: auth});

    // Specify the filter criteria for the list of emails to retrieve
    const filterCriteria = 'is:unread newer_than:1h';
    // Retrieve the list of unread emails
    const res = await gmail.users.messages.list({
      userId: 'me', q: filterCriteria,
    });

    const messages = res.data.messages;
    if (messages?.length) {
      console.log('Analyzing Emails:');
      for (const message of messages) {
        const email = await getEmailContent(gmail, message.id);
        const isJunk = await isJunkRequest(email);

        if (isJunk) {
          console.log('Junk Email:', message.id);
          // forward it to the spam folder
          await gmail.users.messages.modify({
            userId: 'me', id: message.id, requestBody: {
              removeLabelIds: ['INBOX'], addLabelIds: ['SPAM'],
            },
          });
          // forwardEmail(gmail, message.id, 'pamir.khan11@gmail.com');
        } else {
          console.log('Valid Email:', message.id);
          //   add star to the email
          await gmail.users.messages.modify({
            userId: 'me', id: message.id, requestBody: {
              addLabelIds: ['STARRED'],
            },
          });
        }
      }
    } else {
      console.log('No unread emails found.');
    }
  } catch (err) {
    console.error('Error analyzing and forwarding emails:', err);
  }
}
//

// Retrieve email content
async function getEmailContent(gmail, messageId) {
  try {
    const res = await gmail.users.messages.get({
      userId: 'me', id: messageId, format: 'full',
    });

    const email = res.data;
    return email;
  } catch (err) {
    console.error('Error retrieving email content:', err);
    return null;
  }
}

// Analyze email with GPT-3.5 to determine if it's a junk request
async function isJunkRequest(email) {
  return true;
  /*try {
      // Extract the relevant parts of the email for analysis (e.g., subject and body)
      const subject = email.payload.headers.find(
          (header: any) => header.name === 'Subject'
      ).value;
      const body = email.snippet;

      // Compose the prompt for GPT-3.5
      const prompt = `Subject: ${subject}\n\n${body}\n\nLabel:`;

      // Generate response from GPT-3.5
      const gptResponse = await openai.complete({
          engine: 'text-davinci-003',
          prompt,
          maxTokens: 1,
          n: 1,
          stop: '\n',
      });

      // Extract the label from the GPT-3.5 response
      const label = gptResponse.data.choices[0].text.trim().toLowerCase();

      return label === 'junk';
  } catch (err) {
      console.error('Error analyzing email with GPT-3.5:', err);
      return false;
  }*/
}

// Forward email to the specified email address
async function forwardEmail(gmail, messageId, forwardAddress) {
  try {
    await gmail.users.messages.forward({
      userId: 'me', id: messageId, requestBody: {
        raw: `From: me\nTo: ${forwardAddress}\nSubject: Forwarded Email\n\nPlease review the following email:\n\n${messageId}`,
      },
    });

    console.log('Email forwarded successfully.');
  } catch (err) {
    console.error('Error forwarding email:', err);
  }
}


/**
 * Lists the labels in the user's account.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
async function listLabels(auth) {
  const gmail = google.gmail({version: 'v1', auth});
  const res = await gmail.users.labels.list({
    userId: 'me',
  });
  const labels = res.data.labels;
  if (!labels || labels.length === 0) {
    console.log('No labels found.');
    return;
  }
  console.log('Labels:');
  labels.forEach((label) => {
    console.log(`- ${label.name}`);
  });

}

authorize().then(analyzeAndForwardEmails).catch(console.error);




