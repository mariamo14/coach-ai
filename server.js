const express = require('express');
const bodyParser = require('body-parser');
// Remove OpenAI import, we'll use Ollama instead
const sqlite3 = require('sqlite3');
const path = require('path');

// Load environment variables
require('dotenv').config();

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

const db = new sqlite3.Database('./workouts.db');
db.run(`CREATE TABLE IF NOT EXISTS logs (
  id INTEGER PRIMARY KEY,
  exercise TEXT,
  metrics TEXT,
  feedback TEXT,
  ts DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// Create workout sessions table
db.run(`CREATE TABLE IF NOT EXISTS workout_sessions (
  id INTEGER PRIMARY KEY,
  start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  end_time DATETIME,
  summary TEXT
)`);

// Ollama API helper function with better error handling and faster responses
async function callOllama(prompt, model = 'llama3.2:3b') {
  try {
    console.log('Calling Ollama with prompt:', prompt.substring(0, 100) + '...');
    
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.8,
          top_p: 0.9,
          max_tokens: 150, // Keep responses concise
          stop: ['\n\n', 'User:', 'Human:']
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Ollama response:', data.response.substring(0, 100) + '...');
    return data.response.trim();
  } catch (error) {
    console.error('Ollama API error:', error);
    throw error;
  }
}

app.post('/feedback', async (req, res) => {
  try {
    const { metrics, exerciseType, conversational } = req.body;
    
    let prompt;
    if (conversational) {
      // More conversational, Pi-like feedback
      prompt = `You are Pi, a friendly AI fitness coach. The user is doing ${exerciseType}s. 
      
      Their current form metrics: ${JSON.stringify(metrics)}
      
      Give real-time conversational feedback in Pi's style:
      - Use encouraging, supportive tone
      - Keep it short (1-2 sentences max)
      - Be specific about what you see
      - Use natural, conversational language
      - Mix encouragement with gentle corrections
      
      Examples of good responses:
      "Nice depth on that squat! Try to keep your knees tracking over your toes."
      "Great job! I can see you're really focusing on your form."
      "Almost there! Just straighten up your back a little more."
      
      Respond as if you're right there coaching them.`;
    } else {
      prompt = `You are a friendly AI coach. The user did a ${exerciseType}. Their metrics: ${JSON.stringify(metrics)}. Give one concise tip to improve form.`;
    }
    
    const feedback = await callOllama(prompt);
    
    db.run(`INSERT INTO logs (exercise, metrics, feedback) VALUES (?,?,?)`,
      [exerciseType, JSON.stringify(metrics), feedback]
    );
    res.json({ feedback });
  } catch (error) {
    console.error('Error generating feedback:', error);
    res.status(500).json({ error: 'Failed to generate feedback' });
  }
});

// Text-to-speech endpoint - now using browser's Speech Synthesis API
app.post('/speak', async (req, res) => {
  try {
    const { text } = req.body;
    
    // Instead of OpenAI TTS, we'll let the browser handle speech synthesis
    // This is more reliable and doesn't require API calls
    res.json({ 
      text: text,
      useBrowserTTS: true // Signal to frontend to use browser TTS
    });
  } catch (error) {
    console.error('Error with speech endpoint:', error);
    res.status(500).json({ error: 'Failed to process speech request' });
  }
});

// Speech to text endpoint - now using browser's Speech Recognition API
app.post('/transcribe', async (req, res) => {
  try {
    // Browser will handle speech recognition, this endpoint can be used for fallback
    res.json({ 
      useBrowserSTT: true,
      message: 'Using browser speech recognition'
    });
  } catch (error) {
    console.error('Error with transcription endpoint:', error);
    res.status(500).json({ error: 'Failed to process transcription request' });
  }
});

// Assistant response endpoint
app.post('/assistant', async (req, res) => {
  try {
    const { message, context, exercise, workoutActive } = req.body;
    
    const systemPrompt = `You are Pi, an AI personal fitness coach with a warm, encouraging, and conversational personality.

    Key traits:
    - Speak naturally and conversationally, like a supportive friend
    - Use short, clear sentences that flow naturally when spoken
    - Be encouraging and motivational without being overly enthusiastic
    - Show genuine interest in the user's progress and wellbeing
    - Use "I" statements and personal connection ("I can see", "I'm proud of you")
    - Ask follow-up questions to keep the conversation engaging
    - Give specific, actionable advice when needed
    
    Current context:
    - Workout active: ${workoutActive}
    - Current exercise: ${exercise}
    - Recent conversation: ${JSON.stringify(context?.slice(-4) || [])}
    
    Your goals:
    1. Guide workouts with clear, encouraging instructions
    2. Provide real-time form feedback and corrections
    3. Motivate and celebrate progress
    4. Help with workout planning and goal setting
    5. Answer fitness-related questions
    6. Log workouts and track progress
    
    Communication style:
    - Keep responses conversational and natural (2-3 sentences max)
    - Use contractions and casual language
    - Be supportive but not patronizing
    - Focus on being helpful and actionable
    
    Example responses:
    "That's a great question! Let me help you with that."
    "I can see you're working hard. How are you feeling so far?"
    "Nice work! Your form is really improving."
    "Let's try adjusting your stance a bit. Can you widen your feet?"
    
    User message: ${message}
    
    Respond as Pi the fitness coach:`;
    
    const response = await callOllama(systemPrompt);
    
    res.json({ response: response });
  } catch (error) {
    console.error('Error getting assistant response:', error);
    
    // Fallback responses for when Ollama is unavailable
    const fallbackResponses = {
      'hi': "Hi there! I'm your AI coach. Ready to work out?",
      'hello': "Hello! Great to see you. Let's get moving!",
      'how are you': "I'm doing great and ready to help you with your workout!",
      'help': "I'm here to help! I can guide you through exercises and give form feedback.",
      'form': "Your form is looking good! Keep focusing on proper posture.",
      'squat': "For squats, keep your feet shoulder-width apart and go down like you're sitting in a chair.",
      'default': "I'm here to help with your workout! Keep up the great work!"
    };
    
    const userMessage = message.toLowerCase();
    let response = fallbackResponses.default;
    
    // Simple keyword matching for basic responses
    for (const [key, value] of Object.entries(fallbackResponses)) {
      if (userMessage.includes(key)) {
        response = value;
        break;
      }
    }
    
    res.json({ 
      response: response + " (Offline mode - Ollama unavailable)",
      offline_mode: true 
    });
  }
});

// Start/End workout session endpoints
app.post('/workout/start', (req, res) => {
  db.run(`INSERT INTO workout_sessions (start_time) VALUES (CURRENT_TIMESTAMP)`, 
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ sessionId: this.lastID });
    }
  );
});

app.post('/workout/end', (req, res) => {
  const { sessionId, summary } = req.body;
  db.run(`UPDATE workout_sessions SET end_time = CURRENT_TIMESTAMP, summary = ? WHERE id = ?`,
    [summary, sessionId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ success: true });
    }
  );
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));