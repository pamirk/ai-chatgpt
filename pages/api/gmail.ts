const {google} = require('googleapis');
const readline = require('readline');
const OpenAI = require('openai');

// Configure authentication credentials
const credentials = require('./credentials.json');
const SCOPES = ['https://www.googleapis.com/auth/gmail.modify'];

// Create an OAuth2 client
const {client_secret, client_id, redirect_uris} = credentials.web;
const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
);

// Confi gure OpenAI API credentials
// const openai = new OpenAI({
//     apiKey: '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',
// });

// Generate an authorization URL
const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
});

// Create a readline interface for command line input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});


// Analyze and forward emails
async function analyzeAndForwardEmails() {
    try {
        const gmail = google.gmail({version: 'v1', auth: oAuth2Client});

        // Specify the filter criteria
        const filterCriteria = 'is:unread';

        // Retrieve the list of unread emails
        const res = await gmail.users.messages.list({
            userId: 'me',
            q: filterCriteria,
        });

        const messages = res.data.messages;
        if (messages.length) {
            console.log('Analyzing Emails:');
            messages.forEach(async (message: any) => {
                const email = await getEmailContent(gmail, message.id);
                const isJunk = await isJunkRequest(email);

                if (isJunk) {
                    console.log('Junk Email:', message.id);
                    forwardEmail(gmail, message.id, 'your_email@example.com');
                } else {
                    console.log('Valid Email:', message.id);
                }
            });
        } else {
            console.log('No unread emails found.');
        }
    } catch (err) {
        console.error('Error analyzing and forwarding emails:', err);
    }
}

// Retrieve email content
async function getEmailContent(gmail: any, messageId: string) {
    try {
        const res = await gmail.users.messages.get({
            userId: 'me',
            id: messageId,
            format: 'full',
        });

        const email = res.data;
        return email;
    } catch (err) {
        console.error('Error retrieving email content:', err);
        return null;
    }
}

// Analyze email with GPT-3.5 to determine if it's a junk request
async function isJunkRequest(email: any) {
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
async function forwardEmail(gmail: any, messageId: string, forwardAddress: string) {
    try {
        await gmail.users.messages.forward({
            userId: 'me',
            id: messageId,
            requestBody: {
                raw: `From: me\nTo: ${forwardAddress}\nSubject: Forwarded Email\n\nPlease review the following email:\n\n${messageId}`,
            },
        });

        console.log('Email forwarded successfully.');
    } catch (err) {
        console.error('Error forwarding email:', err);
    }
}

console.log('Authorize this app by visiting this URL:', authUrl);
rl.question('Enter the authorization code:', (code: string) => {
    // Exchange the authorization code for an access token
    oAuth2Client.getToken(code, (err: any, token: any) => {
        if (err) {
            console.error('Error retrieving access token:', err);
            return;
        }

        oAuth2Client.setCredentials(token);
        analyzeAndForwardEmails();
    });
});


const handler = async (req: any, res: any) => {
// Prompt user to visit the authorization URL and enter the authorization code

}
export default handler
