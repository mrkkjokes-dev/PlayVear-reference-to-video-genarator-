import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { fal } from '@fal-ai/client';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Multer in-memory storage for handling file uploads (images & audio)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 30 * 1024 * 1024, // 30 MB max
  },
});

// Configure fal client with FAL_KEY
const getFalKey = () =>
  process.env.FAL_KEY?.trim() ||
  process.env.FAL_API_KEY?.trim() ||
  process.env.AI_STUDIO_SECRET_FAL_KEY?.trim() ||
  '';

// Helper for persisting video generation history
const HISTORY_FILE = path.resolve(process.cwd(), 'data', 'video_history.json');

const getStoredHistory = (): any[] => {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      const data = fs.readFileSync(HISTORY_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.warn('Failed to read video_history.json:', e);
  }
  return [];
};

const saveStoredHistory = (history: any[]) => {
  try {
    const dir = path.dirname(HISTORY_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Failed to write video_history.json:', e);
  }
};

// 1. Health & Config Status endpoint
app.get('/api/config-status', (req, res) => {
  const falKey = getFalKey();
  res.json({
    configured: Boolean(falKey && falKey.length > 5),
    keyPrefix: falKey ? `${falKey.slice(0, 4)}...${falKey.slice(-4)}` : null,
    model: 'heygen/heygen-video/reference-to-video',
  });
});

// Video History Persistence Endpoints
app.get('/api/history', (req, res) => {
  try {
    const userEmail = (req.query.userEmail as string || 'guest').toLowerCase();
    const allHistory = getStoredHistory();
    const userHistory = allHistory.filter((item) => (item.userEmail || 'guest').toLowerCase() === userEmail);
    res.json({ success: true, videos: userHistory });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/history', (req, res) => {
  try {
    const { videoItem, userEmail = 'guest' } = req.body;
    if (!videoItem || !videoItem.videoUrl) {
      return res.status(400).json({ error: 'Invalid video item' });
    }

    const allHistory = getStoredHistory();
    const cleanItem = {
      ...videoItem,
      userEmail: userEmail.toLowerCase(),
      imageUrl: videoItem.imageUrl?.startsWith('data:') ? undefined : videoItem.imageUrl,
    };

    const updated = [cleanItem, ...allHistory.filter((item) => item.id !== cleanItem.id)];
    saveStoredHistory(updated);

    res.json({ success: true, video: cleanItem });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/history/:id', (req, res) => {
  try {
    const id = req.params.id;
    const allHistory = getStoredHistory();
    const updated = allHistory.filter((item) => item.id !== id);
    saveStoredHistory(updated);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/history', (req, res) => {
  try {
    const userEmail = (req.query.userEmail as string || 'guest').toLowerCase();
    const allHistory = getStoredHistory();
    const updated = allHistory.filter((item) => (item.userEmail || 'guest').toLowerCase() !== userEmail);
    saveStoredHistory(updated);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Direct File Upload Endpoint (converts uploaded file to fal.storage URL or Data URI)
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const falKey = getFalKey();
    const mimeType = req.file.mimetype;
    const base64Data = req.file.buffer.toString('base64');
    const dataUri = `data:${mimeType};base64,${base64Data}`;

    // If FAL_KEY is configured, try uploading to Fal storage for cleaner CDN URL
    if (falKey) {
      try {
        fal.config({ credentials: falKey });
        const blob = new Blob([new Uint8Array(req.file.buffer)], { type: mimeType });
        const storageUrl = await fal.storage.upload(blob);
        return res.json({
          url: storageUrl,
          type: mimeType.startsWith('image/') ? 'image' : 'audio',
          size: req.file.size,
          name: req.file.originalname,
        });
      } catch (storageErr) {
        console.warn('Fal storage upload fallback to Data URI:', storageErr);
      }
    }

    // Fallback to Data URI if storage fails or FAL_KEY is not yet entered
    return res.json({
      url: dataUri,
      type: mimeType.startsWith('image/') ? 'image' : 'audio',
      size: req.file.size,
      name: req.file.originalname,
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message || 'File upload failed' });
  }
});

// Download Video Direct Attachment Proxy (ensures immediate browser download)
app.get('/api/download-video', async (req, res) => {
  try {
    const videoUrl = req.query.url as string;
    const rawFileName = (req.query.name as string) || 'playvear_portrait_video.mp4';
    const cleanFileName = rawFileName.replace(/[^a-zA-Z0-9._-]/g, '_');

    if (!videoUrl) {
      return res.status(400).send('Missing url parameter');
    }

    const response = await fetch(videoUrl);
    if (!response.ok) {
      return res.status(response.status).send('Failed to fetch remote video file');
    }

    const contentType = response.headers.get('content-type') || 'video/mp4';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${cleanFileName}"`);
    res.setHeader('Cache-Control', 'public, max-age=3600');

    const arrayBuffer = await response.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch (err: any) {
    console.error('Download proxy error:', err);
    res.status(500).send('Video download proxy failed');
  }
});

// 3. Generate Video Endpoint (Calls HeyGen Reference-to-Video on Fal.ai)
app.post('/api/generate-video', async (req, res) => {
  try {
    const falKey = getFalKey();

    if (!falKey) {
      return res.status(401).json({
        error: 'FAL_KEY_MISSING',
        message: 'FAL_KEY is not configured. Please add your Fal.ai API key in the AI Studio Secrets panel or .env file.',
        instruction: 'AI Studio-এর Secrets মেনুতে গিয়ে FAL_KEY হিসেবে আপনার fal.ai কি (Key) সেট করুন।',
      });
    }

    const {
      prompt,
      imageUrl,
      audioUrl,
      videoUrl,
      duration = 5,
      resolution = '768p',
      model = 'heygen/heygen-video/reference-to-video',
    } = req.body;

    if (!imageUrl && !prompt) {
      return res.status(400).json({
        error: 'MISSING_INPUT',
        message: 'At least an image URL or prompt is required to generate video.',
      });
    }

    // Configure client credentials
    fal.config({ credentials: falKey });

    console.log(`Starting video generation with model: ${model}, duration: ${duration}s, res: ${resolution}`);

    // Normalize resolution ('480p', '768p', '1080p', '2k')
    let cleanResolution = (resolution || '768p').toLowerCase();
    if (cleanResolution === '2k') cleanResolution = '2k';

    // Normalize duration (HeyGen accepts 5 to 15 seconds)
    const cleanDuration = Math.max(5, Math.min(15, Math.round(Number(duration) || 5)));

    // Helper to resolve local files or data URIs to fal.storage URL
    const resolveMediaUrl = async (url: string, defaultMime = 'image/jpeg'): Promise<string> => {
      if (!url) return url;
      if (url.startsWith('http://') || url.startsWith('https://')) return url;

      try {
        // If it's a local file path
        if (url.startsWith('/src/') || url.startsWith('src/') || url.startsWith('/public/') || url.startsWith('public/')) {
          const cleanPath = url.replace(/^\//, '');
          const absPath = path.resolve(process.cwd(), cleanPath);
          if (fs.existsSync(absPath)) {
            const buffer = fs.readFileSync(absPath);
            const ext = path.extname(absPath).toLowerCase();
            const mime = ext === '.png' ? 'image/png' : ext === '.wav' ? 'audio/wav' : ext === '.mp3' ? 'audio/mp3' : 'image/jpeg';
            const blob = new Blob([new Uint8Array(buffer)], { type: mime });
            const storageUrl = await fal.storage.upload(blob);
            console.log(`Uploaded local asset ${url} -> ${storageUrl}`);
            return storageUrl;
          }
        }

        // If it's a data URI
        if (url.startsWith('data:')) {
          const mimeMatch = url.match(/^data:([^;]+);base64,/);
          let mime = mimeMatch ? mimeMatch[1] : defaultMime;
          if (mime.startsWith('audio/')) {
            mime = 'audio/wav';
          }
          const base64Content = url.replace(/^data:[^;]+;base64,/, '');
          const buffer = Buffer.from(base64Content, 'base64');
          const blob = new Blob([new Uint8Array(buffer)], { type: mime });
          const storageUrl = await fal.storage.upload(blob);
          console.log(`Uploaded data URI to fal.storage (${mime}) -> ${storageUrl}`);
          return storageUrl;
        }
      } catch (err) {
        console.warn('Failed to upload media to fal.storage, using original:', err);
      }
      return url;
    };

    // Default presenter image fallback if none provided
    const targetImage = imageUrl || '/src/assets/images/bd_tv_anchor_presenter_1792633346511.jpg';
    const resolvedImageUrl = await resolveMediaUrl(targetImage, 'image/jpeg');
    const resolvedAudioUrl = audioUrl ? await resolveMediaUrl(audioUrl, 'audio/wav') : null;
    const resolvedVideoUrl = videoUrl ? await resolveMediaUrl(videoUrl, 'video/mp4') : null;

    // Strict Reference Image Preservation Logic:
    // When an image reference is provided, ensure character face, clothes, and background remain 100% unchanged
    // UNLESS the prompt explicitly requests visual changes (e.g. change clothes or background).
    const changeKeywords = [
      'change clothes', 'change dress', 'change outfit', 'change background',
      'different clothes', 'different background', 'replace background', 'swap background',
      'change shirt', 'change suit', 'alter background', 'new background',
      'পোশাক পরিবর্তন', 'পোশাক বদল', 'ব্যাকগ্রাউন্ড পরিবর্তন', 'ব্যাকগ্রাউন্ড বদল',
      'চেঞ্জ', 'বদল', 'পরিবর্তন'
    ];
    const promptLower = (prompt || '').toLowerCase();
    const isExplicitChangeRequested = changeKeywords.some((kw) => promptLower.includes(kw));

    let effectivePrompt = prompt || '';
    if (resolvedImageUrl && !isExplicitChangeRequested) {
      const strictPreservationPrefix = 'Strictly preserve 100% exact facial identity, physical appearance, hair, clothing, and background environment exactly as shown in the reference image without making any visual alterations or replacements. Only animate natural facial talking expressions, realistic eye contact, subtle head movements, and synchronized mouth lip-syncing matching speech.';
      if (!effectivePrompt || effectivePrompt.trim() === '') {
        effectivePrompt = `${strictPreservationPrefix} Professional presenter speaking naturally directly to the camera.`;
      } else {
        effectivePrompt = `${strictPreservationPrefix} Motion & speech instructions: ${effectivePrompt}`;
      }
    } else if (!effectivePrompt) {
      effectivePrompt = 'Professional presenter speaking naturally, looking into camera with confident facial expressions, matching audio rhythm.';
    }

    let inputPayload: Record<string, any>;

    // HeyGen model requires reference_image_urls array and strictly forbids extra fields
    if (model.includes('heygen')) {
      inputPayload = {
        prompt: effectivePrompt,
        reference_image_urls: resolvedImageUrl ? [resolvedImageUrl] : [],
        duration: cleanDuration,
        resolution: cleanResolution,
        aspect_ratio: '9:16',
      };

      if (resolvedAudioUrl) {
        inputPayload.reference_audio_urls = [resolvedAudioUrl];
      }
      if (resolvedVideoUrl) {
        inputPayload.reference_video_urls = [resolvedVideoUrl];
      }
    } else {
      inputPayload = {
        prompt: effectivePrompt,
        image_url: resolvedImageUrl,
        audio_url: resolvedAudioUrl,
        duration: cleanDuration,
        resolution: cleanResolution,
        aspect_ratio: '9:16',
      };
    }

    console.log('Sending payload to Fal.ai model:', model, JSON.stringify(inputPayload, null, 2));

    // Subscribe to generation with automatic audio-error fallback
    let result: any;
    try {
      result = await fal.subscribe(model, {
        input: inputPayload,
        logs: true,
        onQueueUpdate: (update) => {
          if (update.status === 'IN_PROGRESS') {
            console.log(`Model progress: ${update.status} - Logs:`, update.logs?.slice(-1));
          }
        },
      });
    } catch (subscribeErr: any) {
      console.warn('Initial model subscribe error:', subscribeErr);
      const errDetailStr = JSON.stringify(subscribeErr.body || subscribeErr.message || '');

      // If HeyGen failed specifically on reference_audio parameter, auto-retry with image and prompt
      if (
        inputPayload.reference_audio_urls &&
        (errDetailStr.includes('reference_audio') ||
          errDetailStr.includes('Invalid HeyGen Video parameter') ||
          errDetailStr.includes('audio'))
      ) {
        console.warn('HeyGen audio reference parameter rejected. Auto-recovering without audio to guarantee video generation...');
        delete inputPayload.reference_audio_urls;
        result = await fal.subscribe(model, {
          input: inputPayload,
          logs: true,
          onQueueUpdate: (update) => {
            if (update.status === 'IN_PROGRESS') {
              console.log(`Recovered model progress: ${update.status} - Logs:`, update.logs?.slice(-1));
            }
          },
        });
      } else {
        throw subscribeErr;
      }
    }

    console.log('Video generation finished successfully:', result.data);
    const videoUrlResult =
      (result.data as any)?.video?.url ||
      (result.data as any)?.url ||
      (result.data as any)?.video_url ||
      null;

    res.json({
      success: true,
      videoUrl: videoUrlResult,
      data: result.data,
      requestId: result.requestId,
      modelUsed: model,
      duration: cleanDuration,
      resolution: cleanResolution,
    });
  } catch (error: any) {
    console.error('Fal.ai Generation Error:', error);
    const detailMsg = error.body?.detail
      ? Array.isArray(error.body.detail)
        ? error.body.detail.map((d: any) => `${d.loc?.join('.')}: ${d.msg}`).join(', ')
        : JSON.stringify(error.body.detail)
      : error.message || 'An error occurred during video generation.';

    res.status(500).json({
      error: 'GENERATION_FAILED',
      message: detailMsg,
      details: error.body || error,
    });
  }
});

// Vite Middleware Integration for Development & Production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Playvear Lab] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
