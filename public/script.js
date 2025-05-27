(async function() {
  const video = document.getElementById('video');
  const canvas = document.getElementById('overlay');
  const ctx = canvas.getContext('2d');
  const messages = document.getElementById('messages');
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const startWorkoutBtn = document.getElementById('startWorkout');
  const toggleMicBtn = document.getElementById('toggleMic');
  const audioOutput = document.getElementById('audioOutput');

  // Voice and conversation state
  let isListening = false;
  let isSpeaking = false;
  let recognition = null;
  let workoutActive = false;
  let currentExercise = 'squat';
  let sessionId = null;
  let lastFeedbackTime = 0;
  let conversationContext = [];
  let detector = null;

  // Initialize pose detector with error handling
  async function initializePoseDetector() {
    try {
      updateStatus('Loading pose detection model...', true);
      console.log('Starting pose detector initialization...');
      
      // Try the real pose detection first
      if (window.poseDetection && window.poseDetection.createDetector) {
        console.log('poseDetection object:', poseDetection);
        console.log('Available models:', poseDetection.SupportedModels);
        
        detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet);
        console.log('Real pose detector initialized successfully:', detector);
        addMessage('✅ Pose detection loaded successfully!', 'ai');
        return true;
      }
    } catch (error) {
      console.error('Real pose detector failed:', error);
    }
    
    // Use fallback pose detection
    try {
      console.log('Using fallback pose detection...');
      detector = await window.poseDetectionFallback.createDetector();
      console.log('Fallback pose detector initialized successfully');
      addMessage('⚠️ Using simplified pose detection (demo mode)', 'ai');
      return true;
    } catch (fallbackError) {
      console.error('Fallback pose detector also failed:', fallbackError);
      updateStatus('Pose detection unavailable', false);
      addMessage('Note: Pose detection is currently unavailable, but voice features will still work.', 'ai');
      return false;
    }
  }

  // Initialize speech recognition with better settings
  function initializeSpeechRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognition = new SpeechRecognition();
      
      // Optimized speech recognition settings
      recognition.continuous = false;  // Changed to false for better reliability
      recognition.interimResults = false;  // Changed to false to avoid partial results
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        console.log('🎤 Speech recognition started');
        isListening = true;
        updateStatus('🎤 Listening... Say something!', true);
        statusText.classList.add('listening');
      };

      recognition.onend = () => {
        console.log('🎤 Speech recognition ended');
        isListening = false;
        updateStatus('Ready', false);
        statusText.classList.remove('listening');
        
        // Auto-restart only if workout is active, not speaking, and mic is enabled
        if (workoutActive && !isSpeaking && toggleMicBtn.textContent.includes('Disable')) {
          console.log('Auto-restarting speech recognition in 1 second...');
          setTimeout(() => {
            if (!isSpeaking) {
              startListening();
            }
          }, 1000);
        }
      };

      recognition.onresult = (event) => {
        console.log('🎤 Speech result event:', event);
        
        if (event.results.length > 0) {
          const result = event.results[0];
          if (result.isFinal) {
            const transcript = result[0].transcript.trim();
            console.log('🎤 Final transcript:', transcript);
            
            if (transcript && transcript.length > 1) {
              updateStatus(`Heard: "${transcript}"`, false);
              handleUserSpeech(transcript);
            }
          }
        }
      };

      recognition.onerror = (event) => {
        console.error('🎤 Speech recognition error:', event.error, event);
        
        switch (event.error) {
          case 'not-allowed':
            updateStatus('❌ Microphone access denied', false);
            addMessage('Please allow microphone access in your browser settings and refresh the page.', 'ai');
            toggleMicBtn.disabled = true;
            toggleMicBtn.textContent = '❌ Mic Blocked';
            break;
          case 'no-speech':
            console.log('🎤 No speech detected, will restart automatically');
            break;
          case 'network':
            updateStatus('❌ Network error', false);
            addMessage('Network error with speech recognition. Please check your connection.', 'ai');
            break;
          case 'audio-capture':
            updateStatus('❌ Audio capture error', false);
            addMessage('Could not capture audio. Please check your microphone.', 'ai');
            break;
          default:
            console.log(`🎤 Speech error: ${event.error}, continuing...`);
            updateStatus('Ready', false);
        }
        
        isListening = false;
        statusText.classList.remove('listening');
      };

      console.log('✅ Speech recognition initialized successfully');
      return true;
      
    } else {
      console.error('❌ Speech recognition not supported in this browser');
      updateStatus('❌ Speech not supported', false);
      addMessage('Speech recognition is not supported in this browser. Please use Chrome for voice features.', 'ai');
      
      // Disable the mic button
      toggleMicBtn.disabled = true;
      toggleMicBtn.textContent = '❌ Not Supported';
      toggleMicBtn.style.opacity = '0.5';
      
      return false;
    }
  }

  // Camera setup with error handling
  async function initializeCamera() {
    try {
      updateStatus('Requesting camera access...', true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      video.srcObject = stream;
      console.log('Camera initialized successfully');
      return true;
    } catch (err) {
      console.error('Camera access denied:', err);
      updateStatus('Camera access required', false);
      addMessage('Please allow camera access for pose detection to work properly.', 'ai');
      return false;
    }
  }

  // Request microphone permissions explicitly
  async function requestMicrophonePermission() {
    try {
      updateStatus('Requesting microphone access...', true);
      
      // Request microphone permission explicitly
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Stop the stream immediately - we just needed permission
      stream.getTracks().forEach(track => track.stop());
      
      console.log('Microphone permission granted');
      addMessage('✅ Microphone access granted! Voice features are ready.', 'ai');
      
      // Now initialize speech recognition
      initializeSpeechRecognition();
      
      return true;
    } catch (error) {
      console.error('Microphone permission denied:', error);
      updateStatus('❌ Microphone access denied', false);
      addMessage('⚠️ Microphone access was denied. Voice features will not work. Please refresh and allow microphone access.', 'ai');
      
      // Disable the mic button
      toggleMicBtn.disabled = true;
      toggleMicBtn.textContent = '❌ Mic Blocked';
      toggleMicBtn.style.opacity = '0.5';
      
      return false;
    }
  }

  // Main pose detection loop with immediate feedback
  let sendingFeedback = false;
  async function onFrame() {
    if (!detector) {
      requestAnimationFrame(onFrame);
      return;
    }

    try {
      const poses = await detector.estimatePoses(video);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      if (poses.length) {
        drawSkeleton(poses[0].keypoints);
        
        // Show real-time metrics on screen
        const metrics = computeMetrics(poses[0].keypoints);
        displayMetrics(metrics);
        
        // Provide feedback during workout every 5 seconds
        if (workoutActive && !sendingFeedback) {
          const now = Date.now();
          if (now - lastFeedbackTime > 5000) {
            sendingFeedback = true;
            lastFeedbackTime = now;
            
            await providePoseFeedback(metrics);
            sendingFeedback = false;
          }
        }
      } else {
        // Show "No pose detected" when user is not visible
        ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 20px Arial';
        ctx.fillText('⚠️ Please step into view', 10, 50);
      }
    } catch (error) {
      console.error('Error in pose detection:', error);
    }
    
    requestAnimationFrame(onFrame);
  }

  // Display real-time metrics on the overlay
  function displayMetrics(metrics) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, canvas.height - 120, 200, 110);
    
    ctx.fillStyle = 'white';
    ctx.font = '12px Arial';
    ctx.fillText('📊 Real-time Metrics:', 15, canvas.height - 100);
    ctx.fillText(`Left Knee: ${Math.round(metrics.leftKneeAngle)}°`, 15, canvas.height - 80);
    ctx.fillText(`Right Knee: ${Math.round(metrics.rightKneeAngle)}°`, 15, canvas.height - 65);
    ctx.fillText(`Back Angle: ${Math.round(metrics.backAngle)}°`, 15, canvas.height - 50);
    ctx.fillText(`Stance Width: ${Math.round(metrics.hipWidth)}px`, 15, canvas.height - 35);
    
    // Add form quality indicator
    const avgKneeAngle = (metrics.leftKneeAngle + metrics.rightKneeAngle) / 2;
    let formQuality = 'Good';
    let color = '#4CAF50';
    
    if (avgKneeAngle < 90) {
      formQuality = 'Deep squat!';
      color = '#ff9800';
    } else if (avgKneeAngle < 110) {
      formQuality = 'Perfect depth';
      color = '#4CAF50';
    } else if (avgKneeAngle < 140) {
      formQuality = 'Go deeper';
      color = '#ff5722';
    }
    
    ctx.fillStyle = color;
    ctx.font = 'bold 14px Arial';
    ctx.fillText(`Form: ${formQuality}`, 15, canvas.height - 15);
  }

  // Enhanced skeleton drawing with better visualization and pose feedback
  function drawSkeleton(keypoints) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw a background indicator that pose is being detected
    ctx.fillStyle = 'rgba(0, 255, 136, 0.1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add "POSE DETECTED" indicator
    ctx.fillStyle = '#00ff88';
    ctx.font = 'bold 16px Arial';
    ctx.fillText('🎯 POSE DETECTED', 10, 30);
    
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 4;
    ctx.fillStyle = '#00ff88';
    
    // Draw skeleton connections with glowing effect
    const pairs = [
      [5,7],[7,9],[6,8],[8,10],  // Arms
      [5,6],[5,11],[6,12],[11,12], // Torso
      [11,13],[13,15],[12,14],[14,16] // Legs
    ];
    
    pairs.forEach(([i,j]) => {
      const a = keypoints[i], b = keypoints[j];
      if (a.score > 0.3 && b.score > 0.3) {
        // Glow effect
        ctx.shadowColor = '#00ff88';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    });

    // Draw keypoints with larger, more visible circles
    keypoints.forEach((point, i) => {
      if (point.score > 0.3) {
        ctx.shadowColor = '#00ff88';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(point.x, point.y, 6, 0, 2 * Math.PI);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // Add joint labels for key points
        if ([5,6,11,12,13,14,15,16].includes(i)) {
          ctx.fillStyle = 'white';
          ctx.font = 'bold 10px Arial';
          ctx.fillText(['','','','','','L-Shoulder','R-Shoulder','','','','','L-Hip','R-Hip','L-Knee','R-Knee','L-Ankle','R-Ankle'][i] || '', point.x + 8, point.y - 8);
          ctx.fillStyle = '#00ff88';
        }
      }
    });
  }

  // Enhanced metrics computation
  function computeMetrics(kp) {
    const leftKneeAngle = getAngle(kp[11], kp[13], kp[15]); // hip-knee-ankle
    const rightKneeAngle = getAngle(kp[12], kp[14], kp[16]);
    const backAngle = getAngle(kp[5], kp[11], kp[13]); // shoulder-hip-knee
    
    // Hip width for stance analysis
    const hipWidth = Math.abs(kp[11].x - kp[12].x);
    
    return { 
      leftKneeAngle: leftKneeAngle || 0,
      rightKneeAngle: rightKneeAngle || 0,
      backAngle: backAngle || 0,
      hipWidth,
      timestamp: Date.now()
    };
  }

  function getAngle(a, b, c) {
    if (!a || !b || !c || a.score < 0.3 || b.score < 0.3 || c.score < 0.3) return null;
    
    const ab = [a.x - b.x, a.y - b.y];
    const cb = [c.x - b.x, c.y - b.y];
    const dot = ab[0] * cb[0] + ab[1] * cb[1];
    const mag = Math.hypot(...ab) * Math.hypot(...cb);
    
    if (mag === 0) return null;
    return Math.acos(Math.max(-1, Math.min(1, dot / mag))) * 180 / Math.PI;
  }

  // Voice interaction functions with better debugging and fallback
  async function speak(text) {
    console.log('🔊 Attempting to speak:', text);
    
    if (isSpeaking) {
      console.log('🔊 Already speaking, skipping');
      return;
    }
    
    isSpeaking = true;
    updateStatus('🔊 Speaking...', true);
    statusText.classList.add('speaking');
    
    try {
      // Stop listening while speaking
      if (recognition && isListening) {
        console.log('🔊 Stopping recognition while speaking');
        recognition.stop();
      }

      // Use browser's Speech Synthesis API with better debugging
      if ('speechSynthesis' in window) {
        console.log('🔊 Speech synthesis available');
        
        // Cancel any ongoing speech
        speechSynthesis.cancel();
        
        // Wait a moment for cancellation to complete
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Wait for voices to load if they haven't already
        let voices = speechSynthesis.getVoices();
        console.log('🔊 Available voices:', voices.length);
        
        if (voices.length === 0) {
          console.log('🔊 Waiting for voices to load...');
          await new Promise(resolve => {
            const timeout = setTimeout(() => {
              console.log('🔊 Voice loading timeout');
              resolve();
            }, 2000);
            
            speechSynthesis.onvoiceschanged = () => {
              clearTimeout(timeout);
              voices = speechSynthesis.getVoices();
              console.log('🔊 Voices loaded:', voices.length);
              resolve();
            };
          });
        }
        
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Find the best available voice
        let selectedVoice = null;
        
        // Try to find a good English voice
        const englishVoices = voices.filter(v => v.lang.startsWith('en'));
        console.log('🔊 English voices found:', englishVoices.length);
        
        if (englishVoices.length > 0) {
          // Prefer female voices, then any English voice
          selectedVoice = englishVoices.find(v => v.name.toLowerCase().includes('female')) ||
                         englishVoices.find(v => v.name.toLowerCase().includes('samantha')) ||
                         englishVoices.find(v => v.name.toLowerCase().includes('alex')) ||
                         englishVoices[0];
        } else if (voices.length > 0) {
          selectedVoice = voices[0];
        }
        
        if (selectedVoice) {
          utterance.voice = selectedVoice;
          console.log('🔊 Using voice:', selectedVoice.name, selectedVoice.lang);
        } else {
          console.log('🔊 No voice selected, using default');
        }
        
        // Make speech more natural
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        
        utterance.onstart = () => {
          console.log('🔊 Speech started');
          updateStatus('🔊 Speaking...', true);
          statusText.classList.add('speaking');
        };
        
        utterance.onend = () => {
          console.log('🔊 Speech ended');
          isSpeaking = false;
          updateStatus('Ready', false);
          statusText.classList.remove('speaking');
          
          // Resume listening after speaking if workout is active
          if (workoutActive && toggleMicBtn.textContent.includes('Disable')) {
            console.log('🔊 Resuming listening after speech');
            setTimeout(() => {
              if (!isSpeaking) {
                startListening();
              }
            }, 500);
          }
        };
        
        utterance.onerror = (event) => {
          console.error('🔊 Speech synthesis error:', event);
          isSpeaking = false;
          updateStatus('Speech error', false);
          statusText.classList.remove('speaking');
          
          // Show text fallback
          addMessage(`🔇 ${text}`, 'ai');
        };
        
        console.log('🔊 Starting speech synthesis');
        speechSynthesis.speak(utterance);
        
        // Also add the message to chat immediately
        addMessage(text, 'ai');
        
      } else {
        console.log('🔊 Speech synthesis not available');
        // Fallback to text-only
        addMessage(`🔇 ${text}`, 'ai');
        isSpeaking = false;
        updateStatus('Ready (Text Mode)', false);
        statusText.classList.remove('speaking');
      }
      
    } catch (error) {
      console.error('🔊 Error with text-to-speech:', error);
      addMessage(`🔇 ${text}`, 'ai');
      isSpeaking = false;
      updateStatus('Ready', false);
      statusText.classList.remove('speaking');
    }
  }

  function startListening() {
    if (recognition && !isListening && !isSpeaking) {
      console.log('🎤 Starting speech recognition...');
      try {
        recognition.start();
      } catch (error) {
        console.error('🎤 Error starting recognition:', error);
        updateStatus('Speech recognition error', false);
      }
    } else {
      console.log('🎤 Cannot start listening:', {
        hasRecognition: !!recognition,
        isListening,
        isSpeaking
      });
    }
  }

  function stopListening() {
    if (recognition && isListening) {
      console.log('🎤 Stopping speech recognition...');
      try {
        recognition.stop();
      } catch (error) {
        console.error('🎤 Error stopping recognition:', error);
      }
    }
  }

  // Handle user speech input
  async function handleUserSpeech(transcript) {
    addMessage(transcript, 'user');
    
    // Add to conversation context
    conversationContext.push({ role: 'user', content: transcript });
    
    // Keep conversation context manageable
    if (conversationContext.length > 10) {
      conversationContext = conversationContext.slice(-8);
    }

    try {
      const response = await fetch('/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: transcript,
          context: conversationContext,
          exercise: currentExercise,
          workoutActive: workoutActive
        })
      });

      const data = await response.json();
      
      // Add AI response to context
      conversationContext.push({ role: 'assistant', content: data.response });
      
      // Check if we're in demo mode
      if (data.demo_mode) {
        addMessage(data.response + ' 🔇', 'ai');
        if (!window.demoModeNotified) {
          addMessage('⚠️ Demo Mode: OpenAI quota exceeded. Basic responses only!', 'ai');
          window.demoModeNotified = true;
        }
      } else {
        await speak(data.response);
      }
      
    } catch (error) {
      console.error('Error getting assistant response:', error);
      await speak("Sorry, I didn't catch that. Could you try again?");
    }
  }

  // Provide pose feedback
  async function providePoseFeedback(metrics) {
    try {
      const response = await fetch('/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          metrics, 
          exerciseType: currentExercise,
          conversational: true 
        })
      });

      const data = await response.json();
      
      // Don't interrupt if already speaking
      if (!isSpeaking) {
        await speak(data.feedback);
      }
      
    } catch (error) {
      console.error('Error getting pose feedback:', error);
    }
  }

  // UI Helper functions
  function updateStatus(text, active) {
    statusText.textContent = text;
    if (active) {
      statusDot.classList.add('active');
    } else {
      statusDot.classList.remove('active');
    }
  }

  function addMessage(text, sender = 'ai') {
    const li = document.createElement('li');
    li.className = `bubble ${sender}-bubble`;
    li.textContent = text;
    messages.appendChild(li);
    messages.scrollTop = messages.scrollHeight;
  }

  // Event Listeners
  startWorkoutBtn.addEventListener('click', async () => {
    if (!workoutActive) {
      // Start workout
      try {
        const response = await fetch('/workout/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        const data = await response.json();
        sessionId = data.sessionId;
        
        workoutActive = true;
        startWorkoutBtn.textContent = '🛑 End Workout';
        startWorkoutBtn.classList.add('workout-active');
        
        await speak("Great! Let's start your workout. I'll guide you through some squats. Stand with your feet shoulder-width apart and let's begin!");
        
        // Start voice interaction
        if (recognition) {
          setTimeout(() => startListening(), 2000);
        }
        
      } catch (error) {
        console.error('Error starting workout:', error);
        await speak("Sorry, there was an error starting your workout. Please try again.");
      }
    } else {
      // End workout
      workoutActive = false;
      stopListening();
      
      startWorkoutBtn.textContent = '🎯 Start Workout';
      startWorkoutBtn.classList.remove('workout-active');
      
      try {
        await fetch('/workout/end', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            sessionId, 
            summary: `Completed ${currentExercise} session` 
          })
        });
        
        await speak("Great job! Your workout is complete. You did amazing today!");
        
      } catch (error) {
        console.error('Error ending workout:', error);
      }
    }
  });

  toggleMicBtn.addEventListener('click', async () => {
    if (!recognition) {
      // Request microphone permission and initialize speech recognition
      updateStatus('Requesting microphone access...', true);
      const hasPermission = await requestMicrophonePermission();
      if (!hasPermission) return;
    }
    
    if (recognition) {
      if (toggleMicBtn.textContent.includes('Enable')) {
        // Enable voice - start listening
        updateStatus('Starting voice recognition...', true);
        startListening();
        toggleMicBtn.textContent = '🔇 Disable Voice';
        toggleMicBtn.classList.add('mic-disabled');
        addMessage("Voice activated! Say something to test it out.", 'ai');
      } else {
        // Disable voice - stop listening
        stopListening();
        toggleMicBtn.textContent = '🎤 Enable Voice';
        toggleMicBtn.classList.remove('mic-disabled');
        updateStatus('Voice disabled', false);
        addMessage("Voice recognition disabled.", 'ai');
      }
    }
  });

  // Initialize everything step by step
  async function initialize() {
    try {
      updateStatus('Initializing...', true);
      
      // Initialize camera first
      await initializeCamera();
      
      // Initialize pose detector (non-blocking)
      await initializePoseDetector();
      
      // Start the pose detection loop
      video.onloadeddata = onFrame;
      
      // Request microphone permission during initialization
      addMessage("Hi! I'm your AI coach. Let me set up voice features for you...", 'ai');
      await requestMicrophonePermission();
      
      // Update status to ready
      updateStatus('Ready to start', false);
      
      // Add final greeting message
      addMessage("Perfect! Everything is ready. Click 'Enable Voice' to start voice interaction, then 'Start Workout' when you're ready!", 'ai');
      
      console.log('AI Coach initialized successfully');
      
    } catch (error) {
      console.error('Initialization error:', error);
      updateStatus('Initialization failed', false);
      addMessage('There was an error initializing the AI coach. Some features may not work properly.', 'ai');
    }
  }

  // Start initialization
  initialize();

  // Add a manual test function for speech recognition
  window.testSpeech = function() {
    console.log('🧪 Testing speech recognition manually...');
    console.log('Recognition object:', recognition);
    console.log('Is listening:', isListening);
    console.log('Is speaking:', isSpeaking);
    
    if (recognition) {
      console.log('🧪 Starting manual speech test...');
      try {
        recognition.start();
        setTimeout(() => {
          console.log('🧪 Stopping manual speech test...');
          recognition.stop();
        }, 3000);
      } catch (e) {
        console.error('🧪 Manual test error:', e);
      }
    } else {
      console.log('🧪 No recognition object available');
    }
  };

  // Add a manual test function for text-to-speech
  window.testTTS = function(text = "Hello, this is a test of the text to speech system") {
    console.log('🧪 Testing text-to-speech manually...');
    speak(text);
  };

  // Debug information
  console.log('🔧 Debug functions available:');
  console.log('- window.testSpeech() - Test speech recognition');
  console.log('- window.testTTS() - Test text-to-speech');
  console.log('- Check console for detailed logs');

})();