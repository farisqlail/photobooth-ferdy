export async function mergeVideos(videoUrls: string[]): Promise<string> {
  if (videoUrls.length === 0) return '';

  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = false; // We need audio data, but createMediaElementSource will hijack output so it won't play on speakers

    // Audio setup
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    const audioCtx = new AudioContext();
    const dest = audioCtx.createMediaStreamDestination();
    const sourceNode = audioCtx.createMediaElementSource(video);
    sourceNode.connect(dest);
    // Also connect to destination to hear it? No, we just want to record it.
    // sourceNode.connect(audioCtx.destination); // Optional: if we want the user to hear it while processing

    let recorder: MediaRecorder;
    const chunks: Blob[] = [];

    // Helper to play a single video
    const playVideo = (url: string): Promise<void> => {
      return new Promise((res, rej) => {
        video.src = url;
        video.onloadedmetadata = () => {
          if (canvas.width === 0 || canvas.width === 300) { // Default canvas size is 300x150
             canvas.width = video.videoWidth;
             canvas.height = video.videoHeight;
          }
        };
        
        video.onended = () => {
          res();
        };

        video.onerror = (e) => {
          console.error("Error playing video", e);
          res(); // Skip error video
        };

        video.play().catch(e => {
            console.error("Play error", e);
            res();
        });
      });
    };

    // Animation loop to draw video to canvas
    let animationFrameId: number;
    const draw = () => {
      if (!video.paused && !video.ended) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }
      animationFrameId = requestAnimationFrame(draw);
    };

    // Main sequence
    (async () => {
      try {
        // Load first video metadata to set canvas size before stream creation
        video.src = videoUrls[0];
        await new Promise<void>((r) => {
            video.onloadedmetadata = () => {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                r();
            };
            video.onerror = () => r(); // Fallback
        });

        const stream = canvas.captureStream(30); // 30 FPS
        const audioTrack = dest.stream.getAudioTracks()[0];
        if (audioTrack) {
          stream.addTrack(audioTrack);
        }

        recorder = new MediaRecorder(stream, {
          mimeType: 'video/webm;codecs=vp8,opus',
          videoBitsPerSecond: 2500000 // 2.5 Mbps - target reasonable quality for email
        });

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };

        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          cancelAnimationFrame(animationFrameId);
          audioCtx.close();
          resolve(url);
        };

        recorder.start();
        draw(); // Start drawing loop

        for (const url of videoUrls) {
          await playVideo(url);
        }

        recorder.stop();
      } catch (err) {
        reject(err);
      }
    })();
  });
}
