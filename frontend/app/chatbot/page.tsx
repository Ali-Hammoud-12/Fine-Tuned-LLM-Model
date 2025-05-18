'use client';

import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import AudioPlayer from './../components/audioPlayer';
import axios from 'axios';
import { useRouter } from 'next/router';
interface Message {
  sender: string;
  text: string;
  loading?: boolean;
  image?: string;
  fileName?: string;
  audioUrl?: string; // Add this for audio messages
  fileSize?: number;
}
export default function ChatbotPage() {
  const [userInput, setUserInput] = useState('');
  const [messages, setMessages] = useState<{ sender: string; text: string; loading?: boolean }[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);
  const [volume, setVolume] = useState(0);
  const chatRef = useRef<HTMLDivElement>(null);
  const [loadingMsgIndex, setLoadingMsgIndex] = useState<number | null>(null);
  const attachmentMenuRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const [filePreview, setFilePreview] = useState<{ url: string, type: 'image' | 'video' | 'audio' } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const socketRef = useRef<any>(null);

  // Initialize audio context and analyser
  const initAudioContext = () => {
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    analyserRef.current = audioContextRef.current.createAnalyser();
    analyserRef.current.fftSize = 32;
  };

  // Start recording
  const startRecording = async (): Promise<void> => {
    return new Promise(async (resolve, reject) => {
      try {
        // Check if MediaDevices API is available
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('MediaDevices API or getUserMedia method not available');
        }

        // Check if we're in a secure context (required for microphone access)
        if (window.isSecureContext === false) {
          throw new Error('Microphone access requires a secure context (HTTPS or localhost)');
        }

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        initAudioContext();

        if (audioContextRef.current && analyserRef.current) {
          const source = audioContextRef.current.createMediaStreamSource(stream);
          source.connect(analyserRef.current);

          const processAudio = () => {
            if (!analyserRef.current) return;

            const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
            analyserRef.current.getByteFrequencyData(dataArray);

            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const averageVolume = sum / dataArray.length;
            setVolume(averageVolume);

            animationRef.current = requestAnimationFrame(processAudio);
          };

          processAudio();
        }

        mediaRecorderRef.current = new MediaRecorder(stream);
        mediaRecorderRef.current.ondataavailable = (event) => {
          audioChunksRef.current.push(event.data);
        };
        mediaRecorderRef.current.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/mp3' });
          setRecordedAudio(audioBlob);
          const audioUrl = URL.createObjectURL(audioBlob);
          setAudioURL(audioUrl);
          audioChunksRef.current = [];

          // Save to localStorage
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = () => {
            const base64data = reader.result as string;
            localStorage.setItem('lastVoiceRecording', base64data);
          };
        };

        audioChunksRef.current = [];
        mediaRecorderRef.current.start();
        setIsRecording(true);
        resolve();
      } catch (err) {
        console.error('Error accessing microphone:', err);
        // Show user-friendly error message
        setMessages(prev => [...prev, {
          sender: 'system',
          text: `Could not access microphone: ${err instanceof Error ? err.message : 'Unknown error'}`
        }]);
        reject(err);

      }
    });
  };

  const [streamingMessage, setStreamingMessage] = useState<{
    index: number;
    content: string;
    isStreaming: boolean;
  } | null>(null);
  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }

      // Stop all tracks
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  // Play recorded audio
  const playRecordedAudio = () => {
    if (audioURL) {
      const audio = new Audio(audioURL);
      audio.play();
    }
  };
  const [chatHistory, setChatHistory] = useState<Message[][]>([]);
  const [currentChat, setCurrentChat] = useState<Message[]>([]);


  // Close attachment menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (attachmentMenuRef.current && !attachmentMenuRef.current.contains(event.target as Node)) {
        setShowAttachmentMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  // Update the socket event handler
  useEffect(() => {
    const socket = io('https://talk2liu.click', {
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      console.log('✅ WebSocket connected');
    });

    socket.on('connect_error', (err: Error) => {
      console.error('❌ WebSocket connection error:', err.message);
    });

    socket.on('transcription_update', async (data: { text: string }) => {
      console.log('📝 Transcription update:', data.text);

      // 1. Find and update the loading message
      setMessages(prev => {
        const newMessages = [...prev];
        const loadingIndex = newMessages.findLastIndex(msg => msg.loading);
        if (loadingIndex !== -1) {
          // Keep the media but mark as not loading
          newMessages[loadingIndex] = {
            ...newMessages[loadingIndex],
            loading: false
          };
        }
        return newMessages;
      });

      // 2. Automatically submit the transcription as a text message
      const transcription = data.text;
      if (transcription.trim()) {
        // Add user message
        setMessages(prev => [...prev, {
          sender: 'user',
          text: transcription
        }]);

        // Add loading bot message
        setMessages(prev => [...prev, {
          sender: 'bot',
          text: '',
          loading: true
        }]);

        const botMessageIndex = messages.length + 1; // +1 because we added two messages

        try {
          // Call your API with the transcription
          const apiUrl = process.env.NEXT_PUBLIC_API_URL;
          const response = await axios.post(
            `${apiUrl}/tuning-chat?msg=${encodeURIComponent(transcription)}`
          );

          // Update bot message with response
          setMessages(prev => {
            const newMessages = [...prev];
            if (newMessages[botMessageIndex]) {
              newMessages[botMessageIndex] = {
                sender: 'bot',
                text: cleanBotResponse(response.data.response),
                loading: false
              };
            }
            return newMessages;
          });
        } catch (error: any) {
          console.error('❌ Chat error:', error);
          const errorMessage = error.response?.data?.error ||
            error.message ||
            'Sorry, I encountered an error. Please try again.';

          setMessages(prev => {
            const newMessages = [...prev];
            if (newMessages[botMessageIndex]) {
              newMessages[botMessageIndex] = {
                sender: 'bot',
                text: errorMessage,
                loading: false
              };
            }
            return newMessages;
          });
        }
      }
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, [messages.length]); // Only depend on messages.length to avoid infinite loops

  // Modify the handleSubmit function for file uploads
  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    // Handle audio submission
    if (recordedAudio) {
      const audioFileName = `recording-${Date.now()}.mp3`;
      const audioFile = new File([recordedAudio], audioFileName, { type: 'audio/mp3' });

      setMessages(prev => [...prev, {
        sender: 'user',
        text: '', // Start with empty text for transcription
        audioUrl: audioURL || '',
        fileName: audioFileName,
        loading: true // Add loading state
      }]);

      try {
        // Get presigned URL for audio upload
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        const presignedRes = await axios.post(`${apiUrl}/get_presigned_url`, {
          filename: audioFileName,
          content_type: 'audio/mp3',
        });

        // Upload audio to S3
        await axios.put(presignedRes.data.url, audioFile, {
          headers: {
            'Content-Type': 'audio/mp3',
          },
        });

        // Don't set loading to false here - wait for websocket transcription
        setRecordedAudio(null);
        setAudioURL(null);
      } catch (error) {
        console.error('Audio upload error:', error);
        setMessages(prev => {
          const updated = [...prev];
          const lastIndex = updated.length - 1;
          if (updated[lastIndex]) {
            updated[lastIndex].loading = false;
            updated[lastIndex].text = 'Error uploading voice message';
          }
          return updated;
        });
      }
    }
    // Handle image/file submission
    else if (file) {
      const fileName = file.name;
      setMessages(prev => [...prev, {
        sender: 'user',
        text: '', // Start with empty text for transcription
        image: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
        fileName: fileName,
        loading: true // Add loading state
      }]);

      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        // Get presigned URL from backend
        const presignedRes = await axios.post(`${apiUrl}/get_presigned_url`, {
          filename: fileName,
          content_type: file.type || 'application/octet-stream',
        });

        // Upload file to S3
        await axios.put(presignedRes.data.url, file, {
          headers: {
            'Content-Type': file.type || 'application/octet-stream',
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / (progressEvent.total || 1)
            );
            setMessages(prev => {
              const updated = [...prev];
              const lastIndex = updated.length - 1;
              if (updated[lastIndex]) {
                updated[lastIndex].text = `Uploading ${percentCompleted}%`;
              }
              return updated;
            });
          }
        });

        // Don't set loading to false here - wait for websocket transcription
        setFile(null);
      } catch (error) {
        console.error('Upload error:', error);
        setMessages(prev => {
          const updated = [...prev];
          const lastIndex = updated.length - 1;
          if (updated[lastIndex]) {
            updated[lastIndex].loading = false;
            updated[lastIndex].text = `Error uploading ${fileName}`;
          }
          return updated;
        });
      }
    }
    // Rest of your existing handleSubmit logic for text messages...
    else if (userInput.trim() !== '') {
      const userMessageIndex = messages.length;
      setMessages(prev => [...prev, { sender: 'user', text: userInput }]);

      // Add empty bot message (will be updated)
      setMessages(prev => [...prev, { sender: 'bot', text: '' }]);
      const botMessageIndex = userMessageIndex + 1;

      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        const response = await axios.post(
          `${apiUrl}/tuning-chat?msg=${encodeURIComponent(userInput)}`
        );

        const fullResponse = cleanBotResponse(response.data.response);

        // Start streaming effect
        setStreamingMessage({
          index: botMessageIndex,
          content: '',
          isStreaming: true
        });

        // Simulate streaming
        for (let i = 0; i < fullResponse.length; i++) {
          await new Promise(resolve => setTimeout(resolve, 20)); // 20ms delay
          setStreamingMessage(prev => ({
            index: botMessageIndex,
            content: fullResponse.substring(0, i + 1),
            isStreaming: i < fullResponse.length - 1
          }));

          // Update messages array
          setMessages(prev => {
            const newMessages = [...prev];
            if (newMessages[botMessageIndex]) {
              newMessages[botMessageIndex] = {
                ...newMessages[botMessageIndex],
                text: fullResponse.substring(0, i + 1)
              };
            }
            return newMessages;
          });
        }

        setUserInput('');
      } catch (error: any) {
        console.error('❌ Chat error:', error);
        const errorMessage = error.response?.data?.error ||
          error.message ||
          'Sorry, I encountered an error. Please try again.';

        setMessages(prev => {
          const newMessages = [...prev];
          if (newMessages[botMessageIndex]) {
            newMessages[botMessageIndex] = {
              sender: 'bot',
              text: errorMessage
            };
          }
          return newMessages;
        });
      } finally {
        setStreamingMessage(null);
      }
    }


    setIsSubmitting(false);
  };

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  // Clean up audio resources
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isRecording]);
  // Add this function to strip HTML tags
  // Add this function to clean the response
  const cleanBotResponse = (response: string) => {
    // Remove HTML tags
    const withoutTags = response.replace(/<[^>]*>?/gm, '');
    // Remove "Fine-Tuned LIU ChatBot:" prefix if present
    return withoutTags.replace(/^Fine-Tuned LIU ChatBot:\s*/i, '');
  };

  const formatFileSize = (bytes: number): any => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i]);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const [showVoiceSubMenu, setShowVoiceSubMenu] = useState(false);

  // Update the handleAttachmentClick function
  const handleAttachmentClick = async (type: string) => {
    if (type === 'voice') {
      setShowAttachmentMenu(false);
      setShowVoiceSubMenu(true);
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';

    switch (type) {
      case 'video':
        input.accept = 'video/*';
        break;
      case 'image':
        input.accept = 'image/*';
        input.capture = 'environment';
        break;
      case 'file':
        input.accept = 'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        break;
      default:
        break;
    }

    input.onchange = (e) => {
      const selectedFile = (e.target as HTMLInputElement).files?.[0];
      if (selectedFile) {
        setFile(selectedFile);

        // Create preview based on file type
        if (selectedFile.type.startsWith('image/')) {
          const url = URL.createObjectURL(selectedFile);
          setFilePreview({ url, type: 'image' });
        } else if (selectedFile.type.startsWith('video/')) {
          const url = URL.createObjectURL(selectedFile);
          setFilePreview({ url, type: 'video' });
        } else if (selectedFile.type.startsWith('audio/')) {
          const url = URL.createObjectURL(selectedFile);
          setFilePreview({ url, type: 'audio' });
        }
      }
    };

    input.click();
    setShowAttachmentMenu(false);
  };

  const clearFilePreview = () => {
    if (filePreview?.url) {
      URL.revokeObjectURL(filePreview.url);
    }
    setFile(null);
    setFilePreview(null);
  };

  // Add these new functions for voice file handling
  const handleVoiceFileSelect = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/mp3,audio/*';

    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        console.log('🎵 Audio file selected:', file.name);
        setFile(file);

        // Create a preview of the audio file
        const audioUrl = URL.createObjectURL(file);
        setAudioURL(audioUrl);
        setRecordedAudio(new Blob([file], { type: file.type }));

        setMessages(prev => [...prev, {
          sender: 'user',
          text: `Audio file: ${file.name}`,
          fileName: file.name
        }]);
      }
    };

    input.click();
    setShowVoiceSubMenu(false);
  };
  const router = useRouter();
  const handleBack = () => {
    router.back(); // This will navigate to the previous page in the history stack
  };
  return (
    <div className="container">
      <div className="header ">
        <div className="back-btn">
          <button
            className="back-button"
            onClick={handleBack}
            aria-label="Back to previous conversation"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 18L9 12L15 6" stroke="#2D6ADE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <h2>Fine Tuned LLM Model</h2>
        <div className="gradient-bar"></div>
      </div>

      <div className="chat-container" ref={chatRef}>
        {messages.length === 0 ? (
          <div className="welcome-message">
            <div className="welcome-icon">🤖</div>
            <h3>Welcome to the AI Assistant</h3>
            <p>Ask me anything, upload a file, or send a voice message</p>
          </div>
        ) : (
          messages.map((msg: any, idx) => (
            <div key={idx} className={`message ${msg.sender}`}>
              <div className={`message-bubble ${msg.loading ? 'loading' : ''}`}>
                {msg.loading ? (
                  <div className="loading-indicator">
                    <div className="dot-flashing"></div>
                    <span className="loading-text">Processing media...</span>
                  </div>
                ) : (
                  <>
                    <div className="message-sender">
                      {msg.sender === 'user' ? 'You' : msg.sender === 'bot' ? 'AI Assistant' : 'System'}
                    </div>

                    {/* Image Message */}
                    {msg.image && (
                      <div className="media-container">
                        <img
                          src={msg.image}
                          alt={msg.fileName || 'Uploaded image'}
                          className="uploaded-image"
                          onClick={() => window.open(msg.image, '_blank')}
                        />
                        {msg.text && <div className="image-caption">{msg.text}</div>}
                      </div>
                    )}

                    {/* Audio Message */}
                    {msg.audioUrl && (
                      <div className="audio-message">
                        <AudioPlayer
                          src={msg.audioUrl}
                          fileName={msg.fileName || 'Audio message'}
                        />
                        {msg.text && <div className="audio-caption">{msg.text}</div>}
                      </div>
                    )}

                    {/* File Message (non-image) */}
                    {msg.file && !msg.image && (
                      <div className="file-message">
                        <div className="file-icon">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" fill="#2D6ADE" />
                            <path d="M14 2V8H20" stroke="#2D6ADE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                        <div className="file-info">
                          <div className="file-name">{msg.fileName}</div>
                          <div className="file-size">{msg.fileSize && formatFileSize(msg.fileSize)}</div>
                        </div>
                      </div>
                    )}

                    {/* Text Message (with streaming effect for bot messages) */}
                    {!msg.image && !msg.file && msg.text && (
                      <div className="message-text">
                        {msg.text}
                        {/* Show cursor only for bot messages that are currently streaming */}
                        {msg.sender === 'bot' && streamingMessage?.index === idx && streamingMessage.isStreaming && (
                          <span className="streaming-cursor">|</span>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))
        )}
        {/* Voice recording UI */}
        {audioURL || isRecording ? (
          <div className="voice-recording-container">
            <div className="voice-recording-visualizer">
              {isRecording ? (
                <div className="voice-recording-bars">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div
                      key={i}
                      className="voice-bar"
                      style={{
                        height: `${i % 2 === 0 ? volume : volume / 2}px`,
                        backgroundColor: i % 2 === 0 ? '#BD24DF' : '#2D6ADE'
                      }}
                    />
                  ))}
                </div>
              ) : (
                <button
                  className="play-button"
                  onClick={playRecordedAudio}
                  aria-label="Play recording"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 3L19 12L5 21V3Z" fill="#2D6ADE" stroke="#2D6ADE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              )}
            </div>

            <div className="voice-recording-controls">
              <button
                className={`record-button ${isRecording ? 'recording' : ''}`}
                onClick={isRecording ? stopRecording : startRecording}
                aria-label={isRecording ? 'Stop recording' : 'Start recording'}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 1C10.3431 1 9 2.34315 9 4V12C9 13.6569 10.3431 15 12 15C13.6569 15 15 13.6569 15 12V4C15 2.34315 13.6569 1 12 1Z" fill={isRecording ? '#FF3B30' : '#BD24DF'} />
                  <path d="M19 10V12C19 15.866 15.866 19 12 19C8.13401 19 5 15.866 5 12V10" stroke={isRecording ? '#FF3B30' : '#BD24DF'} strokeWidth="2" strokeLinecap="round" />
                  <path d="M12 19V23M8 23H16" stroke={isRecording ? '#FF3B30' : '#BD24DF'} strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
              {!isRecording && audioURL && (
                <button
                  className="send-button"
                  onClick={handleSubmit} // Changed to directly call handleSubmit
                  aria-label="Send voice message"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22 2L11 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              )}

              {!isRecording && (
                <button
                  className="cancel-button"
                  onClick={() => {
                    setAudioURL(null);
                    setRecordedAudio(null);
                  }}
                  aria-label="Cancel recording"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18 6L6 18" stroke="#6c757d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M6 6L18 18" stroke="#6c757d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              )}
            </div>

            {isRecording && (
              <div className="recording-indicator">
                <div className="recording-dot"></div>
                <span>Recording...</span>
              </div>
            )}
          </div>
        ) : null}
      </div>
      <div className="input-container">
        <div className="attachment-wrapper" ref={attachmentMenuRef}>
          <button
            className="attachment-button"
            onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
            aria-label="Attach file"
            disabled={isRecording}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 15V18C18 19.6569 16.6569 21 15 21H9C7.34315 21 6 19.6569 6 18V6C6 4.34315 7.34315 3 9 3H12" stroke="#2D6ADE" strokeWidth="2" strokeLinecap="round" />
              <path d="M18 15H15C13.3431 15 12 13.6569 12 12V9C12 7.34315 13.3431 6 15 6H18" stroke="#BD24DF" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>

          {/* Main attachment menu */}
          {showAttachmentMenu && (
            <div className="attachment-menu">
              <button onClick={() => handleAttachmentClick('video')}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M23 7L16 12L23 17V7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <rect x="1" y="5" width="15" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
                </svg>
                Video
              </button>
              <button onClick={() => handleAttachmentClick('voice')}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 1C10.3431 1 9 2.34315 9 4V12C9 13.6569 10.3431 15 12 15C13.6569 15 15 13.6569 15 12V4C15 2.34315 13.6569 1 12 1Z" stroke="currentColor" strokeWidth="2" />
                  <path d="M19 10V12C19 15.866 15.866 19 12 19C8.13401 19 5 15.866 5 12V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="M12 19V23M8 23H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                Voice
              </button>
              <button onClick={() => handleAttachmentClick('image')}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M16 13H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M16 17H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M10 9H9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Image
              </button>
            </div>
          )}

          {/* Voice submenu */}
          {showVoiceSubMenu && (
            <div className="voice-sub-menu">
              <button onClick={startRecording}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 1C10.3431 1 9 2.34315 9 4V12C9 13.6569 10.3431 15 12 15C13.6569 15 15 13.6569 15 12V4C15 2.34315 13.6569 1 12 1Z" fill="#BD24DF" />
                  <path d="M19 10V12C19 15.866 15.866 19 12 19C8.13401 19 5 15.866 5 12V10" stroke="#BD24DF" strokeWidth="2" strokeLinecap="round" />
                  <path d="M12 19V23M8 23H16" stroke="#BD24DF" strokeWidth="2" strokeLinecap="round" />
                </svg>
                Record Voice
              </button>
              <button onClick={handleVoiceFileSelect}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="#2D6ADE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M14 2V8H20" stroke="#2D6ADE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Attach MP3
              </button>
            </div>
          )}



        </div>
        {/* 
        <input
          type="text"
          className="chat-input"
          placeholder="Type your message here..."
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isSubmitting || isRecording}
        /> */}
        {/* File preview area */}
        {filePreview && (
          <div className="file-preview-container">
            {filePreview.type === 'image' && (
              <div className="image-preview">
                <img src={filePreview.url} alt="Preview" className="preview-image" />
                <button onClick={clearFilePreview} className="remove-preview-button">
                  ×
                </button>
                {isUploading && (
                  <div className="upload-loader">
                    <div className="circle-loader"></div>
                  </div>
                )}
              </div>
            )}

            {filePreview.type === 'video' && (
              <div className="video-preview">
                <video src={filePreview.url} controls className="preview-video" />
                <button onClick={clearFilePreview} className="remove-preview-button">
                  ×
                </button>
                {isUploading && (
                  <div className="upload-loader">
                    <div className="circle-loader"></div>
                  </div>
                )}
              </div>
            )}

            {filePreview.type === 'audio' && (
              <div className="audio-preview">
                <audio src={filePreview.url} controls className="preview-audio" />
                <button onClick={clearFilePreview} className="remove-preview-button">
                  ×
                </button>
                {isUploading && (
                  <div className="upload-loader">
                    <div className="circle-loader"></div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Only show input when no file is selected */}
        {!filePreview && (
          <input
            type="text"
            className="chat-input"
            placeholder="Type your message here..."
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isSubmitting || isRecording}
          />
        )}
        <button
          className="submit-button"
          onClick={handleSubmit}
          disabled={isSubmitting || (!userInput.trim() && !file && !recordedAudio)}
        >
          {isSubmitting ? (
            <div className="submit-loader"></div>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22 2L11 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      </div>


      <style jsx>
        {`
        .container {
          display: flex;
          flex-direction: column;
          height: 100vh;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          background-color: white;
          box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
          border-radius: 12px;
          overflow: hidden;
        }
        
        .header {
          margin-bottom: 20px;
          position: relative;
          display:flex;
          align-items:center ;
          width:100%;
        }
        
        .header h2 {
          color: #2D6ADE;
          margin-bottom: 8px;
          font-weight: 600;
          width:80%;
        }
        
        .gradient-bar {
          height: 4px;
          width: 100%;
          background: linear-gradient(90deg, #BD24DF 0%, #2D6ADE 100%);
          border-radius: 2px;
        }
        
        .chat-container {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          background-color: #f8f9fa;
          border-radius: 8px;
          margin-bottom: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        .welcome-message {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          text-align: center;
          color: #6c757d;
        }
        
        .welcome-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }
        
        .welcome-message h3 {
          color: #2D6ADE;
          margin-bottom: 8px;
        }
        
        .message {
          display: flex;
          max-width: 80%;
        }
        
        .message.user {
          align-self: flex-end;
        }
        
        .message.bot, .message.system {
          align-self: flex-start;
        }
        
        .message-bubble {
          padding: 12px 16px;
          border-radius: 18px;
          position: relative;
          word-wrap: break-word;
        }
        .streaming-cursor {
  animation: blink 1s infinite;
  color: #2D6ADE;
  margin-left: 2px;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
        .message.user .message-bubble {
          background: linear-gradient(135deg, #BD24DF 0%, #2D6ADE 100%);
          color: white;
          border-bottom-right-radius: 4px;
        }
        
        .message.bot .message-bubble {
          background: #f1f3f5;
          color: black;
          border-bottom-left-radius: 4px;
        }
        
        .message.system .message-bubble {
          background: #e9ecef;
          color: #495057;
          border-bottom-left-radius: 4px;
          font-style: italic;
        }
        
        .message-bubble.loading {
          background: #e9ecef;
          min-width: 100px;
        }
        
        .message-sender {
          font-weight: 600;
          font-size: 0.8em;
          margin-bottom: 4px;
        }
        
        .message.user .message-sender {
          color: rgba(255, 255, 255, 0.8);
        }
        
        .message.bot .message-sender {
          color: #2D6ADE;
        }
        
        .message-text {
          line-height: 1.4;
        }
        
        .input-container {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px;
          background-color: white;
          border-radius: 24px;
          border: 1px solid #dee2e6;
        }
        
        .chat-input {
          flex: 1;
          border: none;
          padding: 12px 16px;
          border-radius: 20px;
          outline: none;
          font-size: 16px;
          background-color: #f8f9fa;
        }
        
        .attachment-button {
          background: none;
          border: none;
          cursor: pointer;
          padding: 8px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background-color 0.2s;
        }
        
        .attachment-button:hover:not(:disabled) {
          background-color: #f1f3f5;
        }
        
        .attachment-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .attachment-wrapper {
          position: relative;
        }
        
        .attachment-menu {
          position: absolute;
          bottom: 100%;
          left: 0;
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          padding: 8px;
          z-index: 10;
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 120px;
        }
         .file-preview-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-right: 8px;
          position: relative;
        }

        .image-preview, .video-preview, .audio-preview {
          position: relative;
          border-radius: 12px;
          overflow: hidden;
          background: #f5f7fa;
        }

        .preview-image {
          max-width: 100%;
          max-height: 150px;
          display: block;
          object-fit: contain;
        }

        .preview-video {
          max-width: 100%;
          max-height: 150px;
          display: block;
        }

        .preview-audio {
          width: 100%;
          outline: none;
        }

        .remove-preview-button {
          position: absolute;
          top: 8px;
          right: 8px;
          background: rgba(0, 0, 0, 0.6);
          color: white;
          border: none;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 14px;
          z-index: 2;
        }
.back-btn{
width:20%;
}
        .upload-loader {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.7);
          z-index: 1;
        }

        .circle-loader {
          width: 24px;
          height: 24px;
          border: 3px solid rgba(45, 106, 222, 0.2);
          border-top-color: #2D6ADE;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .attachment-menu button {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border: none;
          background: none;
          cursor: pointer;
          border-radius: 8px;
          color: #495057;
          font-size: 14px;
        }
        
        .attachment-menu button:hover {
          background-color: #f1f3f5;
          color: #2D6ADE;
        }
        
        .attachment-menu button svg {
          color: inherit;
        }
        
        .submit-button {
          background: linear-gradient(135deg, #BD24DF 0%, #2D6ADE 100%);
          border: none;
          border-radius: 50%;
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: opacity 0.2s;
        }
        
        .submit-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .submit-button:not(:disabled):hover {
          opacity: 0.9;
        }
        
        /* Voice recording styles */
        .voice-recording-container {
          background: white;
          border-radius: 12px;
          padding: 16px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          margin-top: 8px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        .voice-recording-visualizer {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 60px;
          background: #f8f9fa;
          border-radius: 8px;
        }
        
        .voice-recording-bars {
          display: flex;
          align-items: flex-end;
          gap: 4px;
          height: 40px;
        }
        
        .voice-bar {
          width: 4px;
          background-color: #BD24DF;
          border-radius: 2px;
          transition: height 0.1s ease-out;
        }
        
        .play-button {
          background: linear-gradient(135deg, #BD24DF 0%, #2D6ADE 100%);
          border: none;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        
        .voice-recording-controls {
          display: flex;
          justify-content: center;
          gap: 16px;
        }
        
        .record-button {
          background: none;
          border: none;
          cursor: pointer;
          padding: 8px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .record-button.recording {
          animation: pulse 1.5s infinite;
        }
        
        .send-button {
          background: linear-gradient(135deg, #BD24DF 0%, #2D6ADE 100%);
          border: none;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        
        .cancel-button {
          background: none;
          border: none;
          cursor: pointer;
          padding: 8px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .recording-indicator {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          color: #FF3B30;
          font-size: 14px;
        }
        
        .recording-dot {
          width: 10px;
          height: 10px;
          background-color: #FF3B30;
          border-radius: 50%;
          animation: blink 1.5s infinite;
        }
        
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
        
        /* Loader styles */
        .loading-indicator {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px;
        }
        
        .dot-flashing {
          position: relative;
          width: 10px;
          height: 10px;
          border-radius: 5px;
          background-color: #2D6ADE;
          color: #2D6ADE;
          animation: dotFlashing 1s infinite linear alternate;
          animation-delay: 0.5s;
        }
        
        .dot-flashing::before, .dot-flashing::after {
          content: '';
          display: inline-block;
          position: absolute;
          top: 0;
          width: 10px;
          height: 10px;
          border-radius: 5px;
          background-color: #2D6ADE;
          color: #2D6ADE;
        }
           .loading-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px;
        }

        .loading-text {
          font-size: 0.9rem;
          color: #666;
        }

        .audio-caption {
          font-size: 0.8rem;
          color: #666;
          margin-top: 4px;
          padding: 0 4px;
        }
        
        .dot-flashing::before {
          left: -15px;
          animation: dotFlashing 1s infinite alternate;
          animation-delay: 0s;
        }
        
        .dot-flashing::after {
          left: 15px;
          animation: dotFlashing 1s infinite alternate;
          animation-delay: 1s;
        }
        
        @keyframes dotFlashing {
          0% {
            background-color: #2D6ADE;
          }
          50%, 100% {
            background-color: rgba(45, 106, 222, 0.2);
          }
        }
        
        .submit-loader {
          width: 20px;
          height: 20px;
          border: 3px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          border-top-color: white;
          animation: spin 1s ease-in-out infinite;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        /* Responsive styles */
        @media (max-width: 768px) {
          .container {
            padding: 12px;
            height: 100vh;
            border-radius: 0;
          }
          
          .message {
            max-width: 90%;
          }
        }
        
        @media (max-width: 480px) {
          .header h2 {
            font-size: 1.5rem;
          }
          
          .chat-input {
            padding: 10px 14px;
            font-size: 14px;
          }
          
          .submit-button {
            width: 42px;
            height: 42px;
          }
        }


        /* Media message styles */
.media-container {
  margin-top: 8px;
  max-width: 100%;
}

.uploaded-image {
  max-width: 100%;
  max-height: 300px;
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.2s;
  border: 1px solid #eaeaea;
}

.uploaded-image:hover {
  transform: scale(1.02);
}

.image-caption {
  font-size: 0.8rem;
  color: #666;
  margin-top: 4px;
  padding: 0 4px;
}

/* File message styles */
.file-message {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  background: #f5f7fa;
  border-radius: 8px;
  margin-top: 8px;
  border: 1px solid #eaeaea;
}

.file-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.file-info {
  flex: 1;
  min-width: 0;
}

.file-name {
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #2D6ADE;
}

.file-size {
  font-size: 0.75rem;
  color: #666;
  margin-top: 2px;
}

   .voice-sub-menu {
        position: absolute;
        bottom: 100%;
        left: 0;
        background: white;
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        padding: 8px;
        z-index: 10;
        display: flex;
        flex-direction: column;
        gap: 4px;
        min-width: 160px;
      }
      
      .voice-sub-menu button {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        border: none;
        background: none;
        cursor: pointer;
        border-radius: 8px;
        color: #495057;
        font-size: 14px;
        text-align: left;
      }
      
      .voice-sub-menu button:hover {
        background-color: #f1f3f5;
        color: #2D6ADE;
      }
      
      .voice-sub-menu button svg {
        flex-shrink: 0;
      }
      `}</style>
    </div>
  );
}