import { useRef, useState } from "react";

const AudioPlayer = ({ src, fileName }: { src: string, fileName: string }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const audioRef = useRef<HTMLAudioElement | null>(null);
  
    const togglePlayPause = () => {
      if (!audioRef.current) return;
      
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    };
  
    const handleTimeUpdate = () => {
      if (audioRef.current) {
        const currentProgress = (audioRef.current.currentTime / audioRef.current.duration) * 100;
        setProgress(isNaN(currentProgress) ? 0 : currentProgress);
      }
    };
  
    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
    };
  
    return (
      <div className="audio-player-container">
        <audio
          ref={audioRef}
          src={src}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
        />
        
        <div className="audio-player">
          <button className="play-pause-button" onClick={togglePlayPause}>
            {isPlaying ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="6" y="5" width="4" height="14" fill="#2D6ADE"/>
                <rect x="14" y="5" width="4" height="14" fill="#2D6ADE"/>
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 3L19 12L5 21V3Z" fill="#2D6ADE" stroke="#2D6ADE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
          
          <div className="audio-progress-container">
            <div className="audio-progress" style={{ width: `${progress}%` }}></div>
          </div>
          
          <div className="audio-file-info">
            <div className="audio-file-name">{fileName}</div>
            <div className="audio-file-type">MP3</div>
          </div>
        </div>
        <style jsx>{`
 // Add these styles to your style section
.audio-message {
  margin-top: 8px;
}

.audio-player-container {
  width: 100%;
}

.audio-player {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  background: #f5f7fa;
  border-radius: 8px;
  border: 1px solid #eaeaea;
}

.play-pause-button {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.audio-progress-container {
  flex: 1;
  height: 4px;
  background: #e0e0e0;
  border-radius: 2px;
  overflow: hidden;
}

.audio-progress {
  height: 100%;
  background: linear-gradient(135deg, #BD24DF 0%, #2D6ADE 100%);
  transition: width 0.1s linear;
}

.audio-file-info {
  min-width: 0;
}

.audio-file-name {
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #2D6ADE;
}

.audio-file-type {
  font-size: 0.7rem;
  color: #666;
}
      `}</style>
      </div>
    );
  };
  export default AudioPlayer;