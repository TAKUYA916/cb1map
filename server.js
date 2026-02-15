const express = require('express');
const { Storage } = require('@google-cloud/storage');
const path = require('path');
const app = express();

// Google Cloud Storage configuration
const storage = new Storage();
// BUCKET_NAME will be set via environment variable or default to a name based on project
const BUCKET_NAME = process.env.BUCKET_NAME || 'hud-editor-data';
const DATA_FILENAME = 'data.json';

app.use(express.static('.'));
app.use(express.json({ limit: '50mb' }));

// Helper to get bucket reference (creates if checks implemented, but usually pre-created)
const bucket = storage.bucket(BUCKET_NAME);
const file = bucket.file(DATA_FILENAME);

// Load endpoint
app.get('/load', async (req, res) => {
    try {
        const slot = req.query.slot || 'slot1';
        // Basic validation for slot name to prevent abuse
        if (!/^slot[0-9]+$/.test(slot)) {
            return res.status(400).json({ error: 'Invalid slot name' });
        }
        const filename = `data_${slot}.json`;
        console.log(`Loading from ${filename}`);
        const file = bucket.file(filename);

        const [exists] = await file.exists();
        if (!exists) {
            // Return empty/default data if not found
            return res.json({ layers: [], controlBoxes: [] });
        }
        const [content] = await file.download();
        const data = JSON.parse(content.toString());
        res.json(data);
    } catch (err) {
        console.error('Load Error:', err);
        res.status(500).json({ error: 'Failed to load data', details: err.message });
    }
});

// Save endpoint
app.post('/save', async (req, res) => {
    try {
        const slot = req.query.slot || 'slot1';
        if (!/^slot[0-9]+$/.test(slot)) {
            return res.status(400).json({ error: 'Invalid slot name' });
        }
        const filename = `data_${slot}.json`;
        console.log(`Saving to ${filename}`);
        const file = bucket.file(filename);

        const data = req.body;
        await file.save(JSON.stringify(data), {
            contentType: 'application/json',
            metadata: {
                cacheControl: 'no-cache',
            },
        });
        res.json({ success: true });
    } catch (err) {
        console.error('Save Error:', err);
        res.status(500).json({ error: 'Failed to save data', details: err.message });
    }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Using GCS Bucket: ${BUCKET_NAME}`);
});
