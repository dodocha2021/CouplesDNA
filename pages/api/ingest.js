
import { createClient } from '@supabase/supabase-js';
import { HfInference } from '@huggingface/inference';
import formidable from 'formidable';
import fs from 'fs/promises';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import * as cheerio from 'cheerio';

// Basic check if the user is an admin. Replace with your actual auth logic.
async function isAdmin(req) {
    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY
    );
    const { data: { user } } = await supabaseAdmin.auth.getUser(req.headers.authorization?.split(' ')[1]);
    if (!user) return false;
    const { data } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single();
    return data?.role === 'admin';
}

// Hugging Face client for embeddings
const hf = new HfInference(process.env.HUGGINGFACE_API_TOKEN);
const embeddingModel = 'sentence-transformers/all-mpnet-base-v2';

async function getEmbedding(text) {
  const cleanedText = text.replace(/\n/g, ' ');
  const response = await hf.featureExtraction({ model: embeddingModel, inputs: cleanedText });
  return Array.isArray(response) && Array.isArray(response[0]) ? response[0] : response;
}

// Text splitter function
function splitText(text, chunkSize = 500, overlap = 50) {
    const chunks = [];
    let i = 0;
    while (i < text.length) {
        const end = i + chunkSize;
        chunks.push(text.substring(i, end));
        i += chunkSize - overlap;
    }
    return chunks;
}

// --- Text Extractors ---
async function getTextFromUrl(url) {
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);
    $('script, style, nav, footer, header').remove();
    return $('body').text().replace(/\s\s+/g, ' ').trim();
}

async function getTextFromPdf(filePath) {
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdf(dataBuffer);
    return data.text;
}

async function getTextFromDocx(filePath) {
    const { value } = await mammoth.extractRawText({ path: filePath });
    return value;
}

async function getTextFromTxt(filePath) {
    return fs.readFile(filePath, 'utf-8');
}

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
    // if (req.method !== 'POST' || !await isAdmin(req)) {
    //     res.setHeader('Allow', ['POST']);
    //     return res.status(403).json({ error: 'Forbidden: Admin only POST requests allowed.' });
    // }

    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY
    );
    
    try {
        const form = formidable({});
        const [fields, files] = await form.parse(req);

        const category = fields.category?.[0] || 'Uncategorized';
        const sourceUrl = fields.sourceUrl?.[0];
        const uploadedFile = files.file?.[0];

        let text = '';
        let source = 'N/A';

        if (uploadedFile) {
            source = uploadedFile.originalFilename;
            const filePath = uploadedFile.filepath;
            if (uploadedFile.mimetype === 'application/pdf') {
                text = await getTextFromPdf(filePath);
            } else if (uploadedFile.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                text = await getTextFromDocx(filePath);
            } else if (uploadedFile.mimetype === 'text/plain') {
                text = await getTextFromTxt(filePath);
            } else {
                throw new Error('Unsupported file type.');
            }
            await fs.unlink(filePath); // Clean up temp file
        } else if (sourceUrl) {
            source = sourceUrl;
            text = await getTextFromUrl(sourceUrl);
        } else {
            return res.status(400).json({ error: 'No file or URL provided.' });
        }

        if (!text) {
            return res.status(400).json({ error: 'Could not extract text from the source.' });
        }

        const chunks = splitText(text);
        let processedCount = 0;

        for (const chunk of chunks) {
            const embedding = await getEmbedding(chunk);
            const { error } = await supabaseAdmin.from('knowledge_vectors').insert({
                content: chunk,
                embedding,
                category,
                source
            });
            if (error) {
                console.error('Supabase insert error:', error.message);
                // Decide if you want to stop or continue on single chunk failure
            } else {
                processedCount++;
            }
        }

        res.status(200).json({ message: `Successfully ingested and processed ${processedCount} chunks from ${source}.` });

    } catch (error) {
        console.error('Ingest API Error:', error);
        res.status(500).json({ error: error.message });
    }
}
