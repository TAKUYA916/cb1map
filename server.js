const express = require('express');
const { Storage } = require('@google-cloud/storage');
const path = require('path');
const app = express();

// Google Cloud Storage configuration
const storage = new Storage();
// BUCKET_NAME will be set via environment variable or default to a name based on project
const BUCKET_NAME = process.env.BUCKET_NAME || 'sim-mapping-editor-data';
const DATA_FILENAME = 'data.json';

// 起動時にバケット名をログ出力
console.log(`[STARTUP] Using GCS Bucket: ${BUCKET_NAME}`);
console.log(`[STARTUP] Environment: ${process.env.NODE_ENV || 'development'}`);

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
        console.log(`[LOAD] Attempting to load from bucket: ${BUCKET_NAME}, file: ${filename}`);
        const file = bucket.file(filename);

        const [exists] = await file.exists();
        if (!exists) {
            console.log(`[LOAD] File ${filename} does not exist, returning empty data`);
            // Return empty/default data if not found
            return res.json({ layers: [], controlBoxes: [] });
        }
        const [content] = await file.download();
        const data = JSON.parse(content.toString());
        console.log(`[LOAD] Successfully loaded ${filename}`);
        res.json(data);
    } catch (err) {
        console.error('[LOAD ERROR] Full error:', err);
        console.error('[LOAD ERROR] Error code:', err.code);
        console.error('[LOAD ERROR] Error message:', err.message);

        // より詳細なエラーメッセージを返す
        let errorDetails = {
            error: 'Failed to load data',
            message: err.message,
            code: err.code,
            bucket: BUCKET_NAME
        };

        // 権限エラーの場合
        if (err.code === 403 || err.message.includes('permission') || err.message.includes('forbidden')) {
            errorDetails.hint = 'Cloud Runサービスアカウントに Storage Object Viewer 権限が必要です';
        }
        // バケットが存在しない場合
        if (err.code === 404 || err.message.includes('bucket') || err.message.includes('not found')) {
            errorDetails.hint = `バケット "${BUCKET_NAME}" が存在しません。GCPコンソールで作成してください`;
        }

        res.status(500).json(errorDetails);
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
        console.log(`[SAVE] Attempting to save to bucket: ${BUCKET_NAME}, file: ${filename}`);
        const file = bucket.file(filename);

        const data = req.body;
        const dataSize = JSON.stringify(data).length;
        console.log(`[SAVE] Data size: ${dataSize} bytes`);

        await file.save(JSON.stringify(data), {
            contentType: 'application/json',
            metadata: {
                cacheControl: 'no-cache',
            },
        });

        console.log(`[SAVE] Successfully saved ${filename}`);
        res.json({ success: true, slot, filename, size: dataSize });
    } catch (err) {
        console.error('[SAVE ERROR] Full error:', err);
        console.error('[SAVE ERROR] Error code:', err.code);
        console.error('[SAVE ERROR] Error message:', err.message);

        // より詳細なエラーメッセージを返す
        let errorDetails = {
            error: 'Failed to save data',
            message: err.message,
            code: err.code,
            bucket: BUCKET_NAME
        };

        // 権限エラーの場合
        if (err.code === 403 || err.message.includes('permission') || err.message.includes('forbidden')) {
            errorDetails.hint = 'Cloud Runサービスアカウントに Storage Object Creator または Storage Object Admin 権限が必要です';
        }
        // バケットが存在しない場合
        if (err.code === 404 || err.message.includes('bucket') || err.message.includes('not found')) {
            errorDetails.hint = `バケット "${BUCKET_NAME}" が存在しません。GCPコンソールで作成してください`;
        }

        res.status(500).json(errorDetails);
    }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Using GCS Bucket: ${BUCKET_NAME}`);
});
