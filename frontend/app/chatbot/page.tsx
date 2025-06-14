'use client';

import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import AudioPlayer from './../components/audioPlayer';
import axios from 'axios';
import { useRouter } from 'next/navigation';
// import { useRouter } from 'next/router';
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
  const voiceSubMenuRef = useRef<HTMLDivElement>(null);

  // Update the existing useEffect for handling clicks outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Close attachment menu if clicking outside
      if (attachmentMenuRef.current && !attachmentMenuRef.current.contains(event.target as Node)) {
        setShowAttachmentMenu(false);
      }

      // Close voice submenu if clicking outside
      if (voiceSubMenuRef.current && !voiceSubMenuRef.current.contains(event.target as Node)) {
        setShowVoiceSubMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  // Initialize audio context and analyser
  const initAudioContext = () => {
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    analyserRef.current = audioContextRef.current.createAnalyser();
    analyserRef.current.fftSize = 32;
  };

  // Start recording
  const startRecording = async (): Promise<void> => {
    setShowVoiceSubMenu(false); // Close voice submenu when starting recording

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
        clearFilePreview(); // Add this line
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

  const handleAttachmentClick = async (type: string) => {
    if (type === 'voice') {
      setShowAttachmentMenu(false); // Close main menu
      setShowVoiceSubMenu(true);    // Open voice submenu
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    clearFilePreview();

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
    setShowAttachmentMenu(false); // Close menu after selection
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
    setShowVoiceSubMenu(false); // Close voice submenu after selection
  };

  const router = useRouter();
  const handleBack = () => {
    router.back(); // This will navigate to the previous page in the history stack
  };
  return (
    <div className="container">
      <div className="header">
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
                  onClick={handleSubmit}
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
            <div className="voice-sub-menu" ref={voiceSubMenuRef}>
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

      <style jsx>{`
  /* Base Styles */
  .container {
    display: flex;
    flex-direction: column;
    height: 100vh;
    max-width: 100%;
    background: #0A0A1A;
    color: #FFFFFF;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    position: relative;
    overflow: hidden;
  }

  /* Luxury Glass Morphism Effect */
  .container::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle at center, rgba(189, 36, 223, 0.1) 0%, rgba(45, 106, 222, 0.05) 50%, transparent 70%);
    z-index: 0;
    animation: rotateGradient 30s linear infinite;
  }

  @keyframes rotateGradient {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  /* Header Styles */
  .header {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 1.5rem 1rem;
    position: relative;
    z-index: 2;
    background: rgba(10, 10, 26, 0.8);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
  }

  .back-btn {
    position: absolute;
    left: 1.5rem;
    top: 50%;
    transform: translateY(-50%);
  }

  .back-button {
    background: rgba(255, 255, 255, 0.1);
    border: none;
    border-radius: 50%;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.3s ease;
    backdrop-filter: blur(5px);
  }

  .back-button:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: translateX(-3px);
  }

  .header h2 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
    background: linear-gradient(90deg, #BD24DF 0%, #2D6ADE 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    letter-spacing: 0.5px;
  }

  .gradient-bar {
    width: 100px;
    height: 4px;
    background: linear-gradient(90deg, #BD24DF 0%, #2D6ADE 100%);
    border-radius: 2px;
    margin-top: 0.75rem;
  }

  /* Chat Container */
  .chat-container {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    position: relative;
    z-index: 1;
    scroll-behavior: smooth;
  }

  /* Welcome Message */
  .welcome-message {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    height: 100%;
    padding: 2rem;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 16px;
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.05);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  }

  .welcome-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
    background: linear-gradient(135deg, #BD24DF 0%, #2D6ADE 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }

  .welcome-message h3 {
    font-size: 1.5rem;
    margin-bottom: 0.5rem;
    font-weight: 600;
  }

  .welcome-message p {
    color: rgba(255, 255, 255, 0.7);
    font-size: 1rem;
    max-width: 400px;
    line-height: 1.5;
  }

  /* Message Styles */
  .message {
    display: flex;
    max-width: 85%;
  }

  .message.user {
    align-self: flex-end;
  }

  .message.bot {
    align-self: flex-start;
  }

  .message.system {
    align-self: center;
    max-width: 90%;
  }

  .message-bubble {
    padding: 1rem 1.25rem;
    border-radius: 18px;
    position: relative;
    line-height: 1.5;
    font-size: 1rem;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
  }

  .message.user .message-bubble {
    background: linear-gradient(135deg, #BD24DF 0%, #2D6ADE 100%);
    color: white;
    border-bottom-right-radius: 4px;
  }

  .message.bot .message-bubble {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: white;
    border-bottom-left-radius: 4px;
  }

  .message.system .message-bubble {
    background: rgba(10, 10, 26, 0.7);
    border: 1px solid rgba(45, 106, 222, 0.3);
    color: rgba(255, 255, 255, 0.7);
    text-align: center;
    font-size: 0.9rem;
  }

  .message-sender {
    font-size: 0.75rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
    opacity: 0.8;
  }

  .message-text {
    white-space: pre-wrap;
  }

  .streaming-cursor {
    animation: blink 1s infinite;
    color: rgba(255, 255, 255, 0.7);
  }

  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
  }

  /* Loading Indicator */
  .loading-indicator {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .loading-text {
    font-size: 0.9rem;
    color: rgba(255, 255, 255, 0.7);
  }

  .dot-flashing {
    position: relative;
    width: 10px;
    height: 10px;
    border-radius: 5px;
    background-color: #BD24DF;
    color: #BD24DF;
    animation: dotFlashing 1s infinite linear alternate;
    animation-delay: 0.5s;
  }

  .dot-flashing::before, .dot-flashing::after {
    content: '';
    display: inline-block;
    position: absolute;
    top: 0;
  }

  .dot-flashing::before {
    left: -15px;
    width: 10px;
    height: 10px;
    border-radius: 5px;
    background-color: #BD24DF;
    color: #BD24DF;
    animation: dotFlashing 1s infinite alternate;
    animation-delay: 0s;
  }

  .dot-flashing::after {
    left: 15px;
    width: 10px;
    height: 10px;
    border-radius: 5px;
    background-color: #BD24DF;
    color: #BD24DF;
    animation: dotFlashing 1s infinite alternate;
    animation-delay: 1s;
  }

  @keyframes dotFlashing {
    0% {
      background-color: #BD24DF;
    }
    50%, 100% {
      background-color: rgba(189, 36, 223, 0.2);
    }
  }

  /* Media Containers */
  .media-container {
    margin-top: 0.5rem;
    border-radius: 12px;
    overflow: hidden;
  }

  .uploaded-image {
    max-width: 100%;
    max-height: 300px;
    border-radius: 12px;
    cursor: pointer;
    transition: transform 0.3s ease;
  }

  .uploaded-image:hover {
    transform: scale(1.02);
  }

  .image-caption, .audio-caption {
    margin-top: 0.5rem;
    font-size: 0.9rem;
    color: rgba(255, 255, 255, 0.7);
  }

  .audio-message {
    margin-top: 0.5rem;
  }

  .file-message {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    margin-top: 0.5rem;
  }

  .file-icon {
    flex-shrink: 0;
  }

  .file-info {
    flex: 1;
  }

  .file-name {
    font-weight: 500;
    font-size: 0.9rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .file-size {
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.5);
  }

  /* Voice Recording UI */
  .voice-recording-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    padding: 1.5rem;
    background: rgba(10, 10, 26, 0.7);
    border-radius: 16px;
    margin-top: 1rem;
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.05);
  }

  .voice-recording-visualizer {
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    height: 60px;
  }

  .voice-recording-bars {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    height: 40px;
  }

  .voice-bar {
    width: 4px;
    background: linear-gradient(to top, #BD24DF, #2D6ADE);
    border-radius: 2px;
    transition: height 0.1s ease;
  }

  .play-button {
    background: linear-gradient(135deg, #BD24DF 0%, #2D6ADE 100%);
    border: none;
    width: 50px;
    height: 50px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .play-button:hover {
    transform: scale(1.05);
    box-shadow: 0 0 20px rgba(189, 36, 223, 0.5);
  }

  .voice-recording-controls {
    display: flex;
    gap: 1rem;
    align-items: center;
  }

  .record-button {
    background: rgba(255, 255, 255, 0.1);
    border: none;
    width: 50px;
    height: 50px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .record-button.recording {
    background: rgba(255, 59, 48, 0.2);
  }

  .record-button:hover {
    transform: scale(1.05);
  }

  .send-button {
    background: linear-gradient(135deg, #BD24DF 0%, #2D6ADE 100%);
    border: none;
    width: 50px;
    height: 50px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .send-button:hover {
    transform: scale(1.05);
    box-shadow: 0 0 20px rgba(189, 36, 223, 0.5);
  }

  .cancel-button {
    background: rgba(255, 255, 255, 0.05);
    border: none;
    width: 50px;
    height: 50px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .cancel-button:hover {
    background: rgba(255, 255, 255, 0.1);
    transform: scale(1.05);
  }

  .recording-indicator {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
    color: rgba(255, 255, 255, 0.7);
  }

  .recording-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #FF3B30;
    animation: pulse 1.5s infinite;
  }

  @keyframes pulse {
    0% { transform: scale(0.95); opacity: 1; }
    50% { transform: scale(1.1); opacity: 0.7; }
    100% { transform: scale(0.95); opacity: 1; }
  }

  /* Input Container */
  .input-container {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1.25rem;
    background: rgba(10, 10, 26, 0.8);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    position: relative;
    z-index: 2;
  }

  .attachment-wrapper {
    position: relative;
  }

  .attachment-button {
    background: rgba(255, 255, 255, 0.1);
    border: none;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .attachment-button:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: rotate(15deg);
  }

  .attachment-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .attachment-menu, .voice-sub-menu {
    position: absolute;
    bottom: 60px;
    left: 0;
    background: rgba(20, 20, 40, 0.95);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-radius: 16px;
    padding: 0.75rem;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.1);
    z-index: 10;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    min-width: 180px;
    transform-origin: bottom left;
    animation: scaleIn 0.2s ease-out;
  }

  .voice-sub-menu {
    left: 100%;
    bottom: 0;
    margin-left: 0.5rem;
  }

  @keyframes scaleIn {
    from { transform: scale(0.8); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }

  .attachment-menu button, .voice-sub-menu button {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    background: transparent;
    border: none;
    border-radius: 12px;
    color: white;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: left;
  }

  .attachment-menu button:hover, .voice-sub-menu button:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  .chat-input {
    flex: 1;
    padding: 1rem 1.5rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 24px;
    color: white;
    font-size: 1rem;
    transition: all 0.3s ease;
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
  }

  .chat-input:focus {
    outline: none;
    border-color: rgba(189, 36, 223, 0.5);
    box-shadow: 0 0 0 2px rgba(189, 36, 223, 0.2);
  }

  .chat-input::placeholder {
    color: rgba(255, 255, 255, 0.4);
  }

  .submit-button {
    background: linear-gradient(135deg, #BD24DF 0%, #2D6ADE 100%);
    border: none;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .submit-button:hover:not(:disabled) {
    transform: scale(1.05);
    box-shadow: 0 0 20px rgba(189, 36, 223, 0.5);
  }

  .submit-button:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .submit-loader {
    width: 20px;
    height: 20px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* File Preview */
  .file-preview-container {
    position: relative;
    width: 100%;
    margin-bottom: 1rem;
  }

  .image-preview, .video-preview, .audio-preview {
    position: relative;
    border-radius: 12px;
    overflow: hidden;
  }

  .preview-image {
    max-width: 100%;
    max-height: 300px;
    display: block;
    margin: 0 auto;
  }

  .preview-video, .preview-audio {
    width: 100%;
    display: block;
  }

  .remove-preview-button {
    position: absolute;
    top: 10px;
    right: 10px;
    background: rgba(0, 0, 0, 0.7);
    border: none;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    color: white;
    font-size: 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .remove-preview-button:hover {
    background: rgba(0, 0, 0, 0.9);
    transform: scale(1.1);
  }

  .upload-loader {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .circle-loader {
    width: 40px;
    height: 40px;
    border: 4px solid rgba(255, 255, 255, 0.2);
    border-top-color: #BD24DF;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .header {
      padding: 1rem;
    }
    
    .header h2 {
      font-size: 1.25rem;
    }
    
    .chat-container {
      padding: 1rem;
    }
    
    .message {
      max-width: 90%;
    }
    
    .input-container {
      padding: 1rem;
    }
    
    .attachment-menu {
      min-width: 160px;
    }
    
    .voice-sub-menu {
      left: auto;
      right: 5;
      margin-left: 0;
    }
  }

  @media (max-width: 480px) {
    .header {
      padding: 0.75rem 1rem;
    }
    
    .back-button {
      width: 36px;
      height: 36px;
    }
    
    .chat-input {
      padding: 0.75rem 1.25rem;
      font-size: 0.9rem;
    }
    
    .attachment-button, .submit-button {
      width: 42px;
      height: 42px;
    }
    
    .message-bubble {
      padding: 0.75rem 1rem;
      font-size: 0.9rem;
    }
    
    .welcome-message h3 {
      font-size: 1.25rem;
    }
    
    .welcome-message p {
      font-size: 0.9rem;
    }
  }
`}</style>
    </div>
  );
}