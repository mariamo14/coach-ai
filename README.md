# AI Personal Coach - Voice-Based Fitness Assistant

Real-time AI personal trainer with voice feedback and computer vision form analysis.

## Features

🎯 **Real-time Pose Detection** - TensorFlow.js MoveNet for precise form analysis  
🗣️ **Voice Conversations** - Enhanced speech recognition with auto-restart  
🤖 **Pi-like AI Coach** - Encouraging, conversational personality  
📊 **Live Form Metrics** - Real-time knee angles, stance, and form quality  
🔧 **Debug Tools** - Built-in testing functions and error recovery  

## Quick Start

**Prerequisites:** Node.js 16+, Chrome browser, OpenAI API key

```bash
cd coach-ai
npm install
npm start
# Open http://localhost:3000
```

1. Allow camera/microphone access
2. Click "Enable Voice" → "Start Workout"  
3. Exercise and talk: "How's my form?"

## Voice Commands

- "How's my form?" / "Am I doing this right?"
- "What should I focus on?" / "Any tips?"
- "How am I doing?" / "End workout"

## Debug & Troubleshooting

**Test functions** (browser console F12):
```javascript
window.testTTS("Hello")     // Test speech output
window.testSpeech()         // Test voice input
```

**Common fixes:**
- Voice issues: Use Chrome, check mic permissions
- Pose detection: Good lighting, 3-6ft from camera, full body visible

## Tech Stack

Frontend: Vanilla JS, TensorFlow.js, Web Speech API  
Backend: Node.js, Express, SQLite, OpenAI GPT  
Vision: MoveNet pose estimation with real-time metrics

## Project Structure

```
coach-ai/
├── public/index.html     # UI with live metrics
├── public/script.js      # Enhanced voice handling  
├── server.js            # API with error recovery
└── workouts.db          # Session storage
```

Ready to start your AI-powered workout? 💪
