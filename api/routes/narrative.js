const express = require('express');
const router = express.Router();

// NOTE: Save this file as api/routes/narrative.js in your project

// Anthropic API configuration
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

// Helper function to call Anthropic API
async function callAnthropic(messages, systemPrompt) {
  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 4096,
      system: systemPrompt,
      messages: messages
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

// POST /api/review - Analyze notes and return clarifying questions
router.post('/review', async (req, res) => {
  try {
    const { notes, claimType } = req.body;

    if (!notes) {
      return res.status(400).json({ error: 'Notes are required' });
    }

    // System prompt for review
    const systemPrompt = `You are an AI assistant helping property insurance adjusters document claims. Analyze the provided field notes and identify missing information needed for a complete claim file.

Return your response as valid JSON with this structure:
{
  "status": "needs_clarification",
  "questions": ["question 1", "question 2", ...],
  "missing_items": ["missing item 1", "missing item 2", ...]
}

Maximum 5 questions. Be specific and prioritize the most important information gaps.`;

    const messages = [
      {
        role: 'user',
        content: `Claim Type: ${claimType || 'general'}\n\nField Notes:\n${notes}\n\nAnalyze these notes and identify what's missing for a complete claim file. Return only valid JSON.`
      }
    ];

    const responseText = await callAnthropic(messages, systemPrompt);
    
    // Parse the JSON response
    const analysis = JSON.parse(responseText);
    
    res.json(analysis);

  } catch (error) {
    console.error('Review error:', error);
    res.status(500).json({ 
      error: 'Failed to analyze notes',
      message: error.message 
    });
  }
});

// POST /api/generate - Generate final narrative
router.post('/generate', async (req, res) => {
  try {
    const { notes, claimType, answers, outputMode } = req.body;

    if (!notes) {
      return res.status(400).json({ error: 'Notes are required' });
    }

    // System prompt for narrative generation
    const systemPrompt = `You are an AI assistant helping property insurance adjusters write professional claim file narratives.

Generate a clear, professional narrative based on the field notes and any clarifying answers provided.

Return your response as valid JSON with this structure:
{
  "status": "ready",
  "draft": "The complete professional narrative text here...",
  "coverage_status": "Coverage evaluation appears complete based on provided information." OR "Coverage evaluation is incomplete - [reason]" OR "Coverage evaluation status cannot be determined from provided information."
}

Important rules:
- Never invent facts
- Never state coverage exists or does not exist
- Use conservative, defensible language
- Distinguish observed vs. reported information
- Include a disclaimer at the end`;

    let userMessage = `Claim Type: ${claimType || 'general'}\n\nField Notes:\n${notes}`;
    
    if (answers && answers.length > 0) {
      userMessage += `\n\nAdditional Information:\n${answers.join('\n')}`;
    }

    userMessage += `\n\nGenerate a professional ${outputMode || 'narrative'} format claim documentation. Return only valid JSON.`;

    const messages = [
      {
        role: 'user',
        content: userMessage
      }
    ];

    const responseText = await callAnthropic(messages, systemPrompt);
    
    // Parse the JSON response
    const narrative = JSON.parse(responseText);
    
    res.json(narrative);

  } catch (error) {
    console.error('Generate error:', error);
    res.status(500).json({ 
      error: 'Failed to generate narrative',
      message: error.message 
    });
  }
});

module.exports = router;
