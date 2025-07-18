import { formidable } from 'formidable';
import fs from 'fs';
import { google } from 'googleapis';

export const config = {
  api: {
    bodyParser: false,
  },
};

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;
const FOLDER_ID = '1S0eLF6cByJSoFuhPRLJMasq2MCJKQSbQ';

async function getAccessToken() {
  const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
  oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });
  const { token } = await oauth2Client.getAccessToken();
  return { oauth2Client, token };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const form = formidable();
  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(500).json({ error: 'File parse error' });
    }
    let file = files.file;
    if (Array.isArray(file)) file = file[0];
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    try {
      const { oauth2Client } = await getAccessToken();
      const drive = google.drive({ version: 'v3', auth: oauth2Client });
      const fileMetadata = {
        name: file.originalFilename || file.name,
        parents: [FOLDER_ID],
      };
      const media = {
        mimeType: file.mimetype,
        body: fs.createReadStream(file.filepath),
      };
      await drive.files.create({
        resource: fileMetadata,
        media,
        fields: 'id',
      });
      return res.status(200).json({
        fileName: file.originalFilename || file.name,
        message: 'Upload successful',
      });
    } catch (e) {
      console.error('Google Drive upload error:', e);
      return res.status(500).json({ error: 'Google Drive upload failed', detail: e.message });
    }
  });
} 