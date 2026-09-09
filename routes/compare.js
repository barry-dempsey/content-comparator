const express = require('express');
const fileUpload = require('express-fileupload');
const comparisonController = require('../controllers/comparisonController');

const router = express.Router();

router.use(fileUpload({ limits: { fileSize: 50 * 1024 * 1024 } }));

// Compare two JSON objects via request body
router.post('/compare', comparisonController.compareSingle);

// Compare two JSON files via file upload
router.post('/compare-files', comparisonController.compareFiles);

// Batch compare multiple target languages via request body
router.post('/batch-compare', comparisonController.batchCompareJSON);

// Batch compare multiple target language files
router.post('/batch-compare-files', comparisonController.batchCompareFiles);

module.exports = router;
