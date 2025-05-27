#!/usr/bin/env bash

# Create folders
mkdir -p public

# 1) public/index.html
cat > public/index.html << 'EOF2'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AI Coach PoC</title>
  <style>
    body { display: flex; }
    #video, #overlay { position: absolute; top: 0; left: 0; }
    #chat { margin-left: 640px; max-width: 300px; }
    #chat ul { list-style: none; padding: 0; }
    .bubble { margin: 8px 0; padding: 8px; border-radius: 8px; background: #f0f0f0; }
  </style>
</head>
<body>
  <div style="position: relative; width: 640px; height: 480px;">
    <video id="video" width="640" height="480" autoplay muted></video>
    <canvas id="overlay" width="640" height="480"></canvas>
  </div>
  <div id="chat">
    <h2>AI Coach</h2>
    <ul id="messages"></ul>
    <button id="startSquat">Start Squat Set</button>
  </div>
  <script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-core"></script>
  <script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-webgl"></script>
  <script src="https://cdn.jsdelivr.net/npm/@tensorflow-models/pose-detection"></script>
  <script src="script.js"></script>
</body>
</html>
EOF2

# 2) public/script.js
cat > public/script.js << 'EOF2'
(async function() {
  const video = document.getElementById('video');
  const canvas = document.getElementById('overlay');
  const ctx = canvas.getContext('2d');
  const messages = document.getElementById('messages');
  const detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet);

  navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
    video.srcObject = stream;
  });

  let sendingFeedback = false;
  async function onFrame() {
    const poses = await detector.estimatePoses(video);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (poses.length) drawSkeleton(poses[0].keypoints);
    if (!sendingFeedback && poses.length) {
      sendingFeedback=true;
      const metrics = computeMetrics(poses[0].keypoints);
      const feedback = await getFeedback(metrics,'squat');
      addMessage(feedback);
      sendingFeedback=false;
    }
    requestAnimationFrame(onFrame);
  }
  video.onloadeddata = onFrame;

  function drawSkeleton(kp) {
    ctx.strokeStyle='red';ctx.lineWidth=2;
    const pairs=[[5,7],[7,9],[6,8],[8,10],[5,6],[5,11],[6,12],[11,12]];
    pairs.forEach(([i,j])=>{
      const a=kp[i],b=kp[j];
      if(a.score>0.5&&b.score>0.5){
        ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
      }
    });
  }

  function computeMetrics(kp){
    const angle=getAngle(kp[5],kp[7],kp[9]);
    return { kneeAngle: angle };
  }
  function getAngle(a,b,c){
    const ab=[a.x-b.x,a.y-b.y],cb=[c.x-b.x,c.y-b.y];
    const dot=ab[0]*cb[0]+ab[1]*cb[1];
    return Math.acos(dot/(Math.hypot(...ab)*Math.hypot(...cb)))*180/Math.PI;
  }

  async function getFeedback(metrics,exerciseType){
    const res=await fetch('/feedback',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({metrics,exerciseType})
    });
    return (await res.json()).feedback;
  }

  function addMessage(text){
    const li=document.createElement('li');
    li.className='bubble';li.textContent=text;
    messages.appendChild(li);
  }
})();
EOF2

# 3) server.js
cat > server.js << 'EOF2'
const express = require('express');
const bodyParser = require('body-parser');
const { Configuration, OpenAIApi } = require('openai');
const sqlite3 = require('sqlite3');
const path = require('path');

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

const db = new sqlite3.Database('./workouts.db');
db.run(\`CREATE TABLE IF NOT EXISTS logs (
  id INTEGER PRIMARY KEY,
  exercise TEXT,
  metrics TEXT,
  feedback TEXT,
  ts DATETIME DEFAULT CURRENT_TIMESTAMP
)\`);

const openai = new OpenAIApi(new Configuration({
  apiKey: process.env.OPENAI_API_KEY
}));

app.post('/feedback', async (req, res) => {
  const { metrics, exerciseType } = req.body;
  const prompt = \`You are a friendly AI coach. The user did a \${exerciseType}. Their metrics: \${JSON.stringify(metrics)}. Give one concise tip to improve form.\`;
  const chatRes = await openai.createChatCompletion({
    model: 'gpt-4o-mini',
    messages: [{ role: 'system', content: prompt }]
  });
  const feedback = chatRes.data.choices[0].message.content.trim();
  db.run(
    \`INSERT INTO logs (exercise, metrics, feedback) VALUES (?,?,?)\`,
    [exerciseType, JSON.stringify(metrics), feedback]
  );
  res.json({ feedback });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(\`Server running on http://localhost:\${PORT}\`));
EOF2

# 4) package.json
cat > package.json << 'EOF2'
{
  "name": "ai-coach-poc",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "@tensorflow-models/pose-detection": "^0.0.5",
    "@tensorflow/tfjs-backend-webgl": "^4.2.0",
    "@tensorflow/tfjs-core": "^4.2.0",
    "body-parser": "^1.20.0",
    "express": "^4.18.2",
    "openai": "^4.2.1",
    "sqlite3": "^5.1.6"
  }
}
EOF2

echo "✅ Setup complete. Run:\n   chmod +x init.sh && bash init.sh  # only once to generate files\n   npm install && npm start"
