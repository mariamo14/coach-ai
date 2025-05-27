# AI Personal Coach - Voice-Based Fitness Assistant

A proof of concept for an AI personal trainer that provides real-time voice feedback on your workout form using computer vision and conversational AI, similar to the Pi app experience.

## Features

🎯 **Real-time Pose Detection** - Uses TensorFlow.js to analyze your form during exercises  
🗣️ **Voice Conversations** - Natural speech recognition and text-to-speech for hands-free interaction  
🤖 **Pi-like AI Coach** - Encouraging, conversational personality that guides your workouts  
📊 **Form Analysis** - Provides specific feedback on knee angles, stance, and posture  
📱 **Modern UI** - Clean, responsive interface with visual status indicators  
💾 **Workout Logging** - Tracks your sessions and progress over time  

## Technology Stack

- **Frontend**: Vanilla JavaScript, TensorFlow.js, Web Speech API
- **Backend**: Node.js, Express, SQLite
- **AI**: OpenAI GPT-4 for conversations, TTS for voice synthesis
- **Computer Vision**: TensorFlow.js MoveNet for pose detection

## Quick Start

### Prerequisites

- Node.js 16+ installed
- Webcam access
- OpenAI API key
- Modern browser with WebRTC support (Chrome/Safari recommended)

### Installation

1. **Clone and install dependencies:**

   ```bash
   cd coach-ai
   npm install
   ```

2. **Set up environment variables:**

   ```bash
   cp .env.example .env
   # Edit .env and add your OpenAI API key
   ```

3. **Start the server:**

   ```bash
   npm start
   ```

4. **Open your browser:**

   ```
   http://localhost:3000
   ```

### First Run

1. **Grant camera permissions** when prompted
2. **Click "Enable Voice"** to start speech recognition
3. **Click "Start Workout"** to begin your session
4. **Say "Hi" or "How's my form?"** to interact with your AI coach
5. **Perform squats** in front of the camera for real-time feedback

## How It Works

### 1. Pose Detection

- Real-time body pose estimation using MoveNet
- Analyzes key points: shoulders, hips, knees, ankles
- Calculates joint angles and stance metrics

### 2. AI Coaching

- **Real-time feedback**: Automatic form analysis every 3 seconds
- **Voice interaction**: Natural conversation about workouts and technique
- **Contextual responses**: Remembers conversation history
- **Encouraging tone**: Pi-like personality that motivates and supports

### 3. Voice Interface

- **Speech Recognition**: Continuous listening during workouts
- **Text-to-Speech**: Natural voice responses using OpenAI TTS
- **Smart pausing**: Stops listening while speaking to avoid feedback loops

## Usage Examples

### Voice Commands You Can Try:

- "How's my form looking?"
- "Am I going deep enough on my squats?"
- "Can you count my reps?"
- "What should I focus on?"
- "How many calories did I burn?"
- "End my workout"

### What the AI Coach Provides:

- Real-time form corrections
- Motivational encouragement
- Exercise guidance
- Rep counting assistance
- Progress tracking
- Workout summaries

## Configuration

### Environment Variables

```bash
# Required
OPENAI_API_KEY=your_api_key_here

# Optional
PORT=3000
```

### Supported Exercises

Currently optimized for:

- **Squats** (primary focus)
- Extensible to lunges, push-ups, and other exercises

## Browser Compatibility

- ✅ Chrome 80+ (recommended)
- ✅ Safari 14+
- ✅ Edge 80+
- ❌ Firefox (limited Web Speech API support)

## Development

### File Structure

```
coach-ai/
├── public/
│   ├── index.html      # Main UI
│   └── script.js       # Frontend logic
├── server.js           # Backend API
├── package.json        # Dependencies
├── .env.example        # Environment template
└── README.md          # This file
```

### API Endpoints

- `POST /feedback` - Get form feedback from pose metrics
- `POST /speak` - Convert text to speech
- `POST /assistant` - Chat with AI coach
- `POST /workout/start` - Begin workout session
- `POST /workout/end` - End workout session

### Adding New Exercises

1. **Update pose metrics** in `computeMetrics()` function
2. **Modify feedback prompts** in `/feedback` endpoint
3. **Train AI** with exercise-specific instructions

## Troubleshooting

### Common Issues

**Camera not working:**

- Ensure browser has camera permissions
- Try refreshing the page
- Check if camera is being used by another app

**Voice not working:**

- Use Chrome for best compatibility
- Ensure microphone permissions are granted
- Check browser console for speech API errors

**AI not responding:**

- Verify OpenAI API key is set correctly
- Check network connection
- Review server console for API errors

**Pose detection not accurate:**

- Ensure good lighting
- Stand 3-6 feet from camera
- Wear contrasting colors
- Make sure full body is visible

## Roadmap

### Planned Features

- 📈 **Progress Analytics** - Detailed workout statistics and trends
- 🏃 **More Exercises** - Push-ups, lunges, planks, yoga poses
- 👥 **Multi-user Support** - Individual profiles and progress tracking
- 📱 **Mobile App** - Native iOS/Android applications
- 🎮 **Gamification** - Achievement system and challenges
- 🔄 **Workout Plans** - Structured programs and routines

### Technical Improvements

- Edge computing for faster pose detection
- Advanced biomechanics analysis
- Integration with fitness wearables
- Offline mode capabilities

## License

MIT License - feel free to use this for your own projects!

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Support

If you encounter issues or have questions:

1. Check the troubleshooting section
2. Review browser console for errors
3. Open an issue on GitHub
4. Provide details about your setup and the problem

---

**Ready to start your AI-powered fitness journey? Let's go! 💪**