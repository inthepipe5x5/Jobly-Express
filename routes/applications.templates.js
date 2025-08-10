const express = require('express');
const db = require('../models/db'); // adjust path as needed
const storage = require('../utils/storage'); // adjust path as needed
const { renderDocxWithDocxtemplater, convertDocxToPdf } = require('../utils/docxUtils'); // adjust path as needed

/** route to handle templates for cover letters and documents */
const router = express.Router();

// GET /api/templates - List all templates
router.get('/api/templates', async (req, res) => {
  try {
    const templates = await db.listTemplates();
    res.json({ templates });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// GET /api/templates/:id - Get a specific template (including form schema)
router.get('/api/templates/:id', async (req, res) => {
  try {
    const template = await db.getTemplate(req.params.id);
    res.json({ template });
  } catch (err) {
    res.status(404).json({ error: 'Template not found' });
  }
});

// POST /api/resumes/render - Render a resume/CV from a template and user data
router.post('/api/resumes/render', async (req, res) => {
  try {
    const { templateId, data, formats } = req.body;
    const template = await db.getTemplate(templateId);
    if (!template) return res.status(404).json({ error: 'Template not found' });

    const templateBuffer = await storage.get(template.file_key);

    // Merge user data (skills, job histories, etc.) with provided data
    const userId = req.user?.id || data.userId; // adjust as needed for auth
    const userProfile = await db.getUserProfile(userId);
    const mergedData = { ...userProfile, ...data };

    // Render DOCX
    const docx = await renderDocxWithDocxtemplater(templateBuffer, mergedData);

    let pdf;
    if (formats && formats.includes('pdf')) {
      pdf = await convertDocxToPdf(docx);
    }

    // Save resume record (optional, adjust as needed)
    const resumeId = await db.saveResume({
      userId,
      templateId,
      data: mergedData,
      fileKeys: { docx: 'docx-key', pdf: pdf ? 'pdf-key' : undefined }
    });

    // Upload files to storage (pseudo, adjust as needed)
    await storage.put(`resumes/${resumeId}.docx`, docx);
    if (pdf) await storage.put(`resumes/${resumeId}.pdf`, pdf);

    res.json({
      resumeId,
      files: {
        docx: `/api/resumes/${resumeId}/download?fmt=docx`,
        ...(pdf && { pdf: `/api/resumes/${resumeId}/download?fmt=pdf` })
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to render resume' });
  }
});

// GET /api/resumes/:id/download - Download rendered resume
router.get('/api/resumes/:id/download', async (req, res) => {
  try {
    const { id } = req.params;
    const fmt = req.query.fmt || 'docx';
    const key = `resumes/${id}.${fmt}`;
    const file = await storage.get(key);
    if (!file) return res.status(404).json({ error: 'File not found' });

    res.setHeader('Content-Disposition', `attachment; filename=resume.${fmt}`);
    res.setHeader('Content-Type', fmt === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.send(file);
  } catch (err) {
    res.status(500).json({ error: 'Failed to download file' });
  }
});

module.exports = router;
