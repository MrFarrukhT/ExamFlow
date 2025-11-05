/**
 * Cambridge Speaking Test - Audio Recorder Module
 * Handles audio recording for speaking tests with microphone permission,
 * quality checks, and audio file management
 */

class CambridgeAudioRecorder {
    constructor() {
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.audioBlob = null;
        this.stream = null;
        this.recordingStartTime = null;
        this.recordingEndTime = null;
        this.isRecording = false;
        this.isPaused = false;
        
        // Audio constraints for good quality
        this.audioConstraints = {
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
                channelCount: 1, // Mono to save space
                sampleRate: 44100
            }
        };
    }

    /**
     * Check if browser supports audio recording
     */
    static isSupported() {
        return !!(navigator.mediaDevices && 
                 navigator.mediaDevices.getUserMedia && 
                 window.MediaRecorder);
    }

    /**
     * Request microphone permission and initialize
     */
    async initialize() {
        if (!CambridgeAudioRecorder.isSupported()) {
            throw new Error('Your browser does not support audio recording. Please use Chrome, Firefox, or Edge.');
        }

        try {
            // Request microphone access
            this.stream = await navigator.mediaDevices.getUserMedia(this.audioConstraints);
            
            // Test microphone is working
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const analyser = audioContext.createAnalyser();
            const microphone = audioContext.createMediaStreamSource(this.stream);
            microphone.connect(analyser);
            analyser.fftSize = 256;
            
            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            analyser.getByteFrequencyData(dataArray);
            
            // Check if microphone is detecting sound
            const hasSound = dataArray.some(value => value > 0);
            
            audioContext.close();
            
            return {
                success: true,
                message: 'Microphone initialized successfully',
                hasSound: hasSound
            };
            
        } catch (error) {
            if (error.name === 'NotAllowedError') {
                throw new Error('Microphone permission denied. Please allow microphone access to take the speaking test.');
            } else if (error.name === 'NotFoundError') {
                throw new Error('No microphone found. Please connect a microphone to take the speaking test.');
            } else {
                throw new Error(`Microphone initialization failed: ${error.message}`);
            }
        }
    }

    /**
     * Test microphone audio levels (for pre-test check)
     */
    async testMicrophoneLevel(duration = 3000) {
        if (!this.stream) {
            await this.initialize();
        }

        return new Promise((resolve) => {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const analyser = audioContext.createAnalyser();
            const microphone = audioContext.createMediaStreamSource(this.stream);
            microphone.connect(analyser);
            analyser.fftSize = 256;
            
            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            
            let maxLevel = 0;
            let hasDetectedSound = false;
            
            const checkLevel = () => {
                analyser.getByteFrequencyData(dataArray);
                const average = dataArray.reduce((a, b) => a + b) / bufferLength;
                
                if (average > maxLevel) {
                    maxLevel = average;
                }
                
                if (average > 5) { // Threshold for sound detection
                    hasDetectedSound = true;
                }
            };
            
            const interval = setInterval(checkLevel, 100);
            
            setTimeout(() => {
                clearInterval(interval);
                audioContext.close();
                
                resolve({
                    maxLevel: maxLevel,
                    hasSound: hasDetectedSound,
                    quality: maxLevel > 20 ? 'good' : maxLevel > 5 ? 'fair' : 'poor'
                });
            }, duration);
        });
    }

    /**
     * Start recording
     */
    async startRecording() {
        if (!this.stream) {
            await this.initialize();
        }

        // Reset previous recording
        this.audioChunks = [];
        this.audioBlob = null;
        
        // Create MediaRecorder
        const options = {
            mimeType: this.getSupportedMimeType()
        };
        
        this.mediaRecorder = new MediaRecorder(this.stream, options);
        
        // Handle data available event
        this.mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                this.audioChunks.push(event.data);
            }
        };
        
        // Handle recording stop
        this.mediaRecorder.onstop = () => {
            this.audioBlob = new Blob(this.audioChunks, { type: options.mimeType });
            this.recordingEndTime = new Date();
        };
        
        // Start recording
        this.mediaRecorder.start(1000); // Collect data every second
        this.recordingStartTime = new Date();
        this.isRecording = true;
        this.isPaused = false;
        
        console.log('🎤 Recording started');
    }

    /**
     * Pause recording
     */
    pauseRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            this.mediaRecorder.pause();
            this.isPaused = true;
            console.log('⏸️ Recording paused');
        }
    }

    /**
     * Resume recording
     */
    resumeRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
            this.mediaRecorder.resume();
            this.isPaused = false;
            console.log('▶️ Recording resumed');
        }
    }

    /**
     * Stop recording
     */
    stopRecording() {
        return new Promise((resolve) => {
            if (!this.mediaRecorder) {
                resolve(null);
                return;
            }

            this.mediaRecorder.onstop = () => {
                this.audioBlob = new Blob(this.audioChunks, { 
                    type: this.mediaRecorder.mimeType 
                });
                this.recordingEndTime = new Date();
                this.isRecording = false;
                this.isPaused = false;
                
                console.log('⏹️ Recording stopped');
                resolve(this.audioBlob);
            };

            if (this.mediaRecorder.state !== 'inactive') {
                this.mediaRecorder.stop();
            }
        });
    }

    /**
     * Get supported MIME type for recording
     */
    getSupportedMimeType() {
        const types = [
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/ogg;codecs=opus',
            'audio/mp4',
            'audio/wav'
        ];
        
        for (const type of types) {
            if (MediaRecorder.isTypeSupported(type)) {
                return type;
            }
        }
        
        return ''; // Browser will use default
    }

    /**
     * Get recording duration in seconds
     */
    getRecordingDuration() {
        if (this.recordingStartTime && this.recordingEndTime) {
            return Math.floor((this.recordingEndTime - this.recordingStartTime) / 1000);
        }
        return 0;
    }

    /**
     * Get audio blob
     */
    getAudioBlob() {
        return this.audioBlob;
    }

    /**
     * Get audio as base64 string (for database storage)
     */
    async getAudioAsBase64() {
        if (!this.audioBlob) {
            return null;
        }

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                // Remove data URL prefix to get just base64
                const base64String = reader.result.split(',')[1];
                resolve(base64String);
            };
            reader.onerror = reject;
            reader.readAsDataURL(this.audioBlob);
        });
    }

    /**
     * Get audio URL for playback
     */
    getAudioURL() {
        if (!this.audioBlob) {
            return null;
        }
        return URL.createObjectURL(this.audioBlob);
    }

    /**
     * Download audio file
     */
    downloadAudio(filename = 'speaking-recording.webm') {
        if (!this.audioBlob) {
            console.error('No recording available to download');
            return;
        }

        const url = URL.createObjectURL(this.audioBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Clean up resources
     */
    cleanup() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        
        if (this.mediaRecorder) {
            this.mediaRecorder = null;
        }
        
        this.audioChunks = [];
        this.audioBlob = null;
        this.isRecording = false;
        this.isPaused = false;
        
        console.log('🧹 Audio recorder cleaned up');
    }

    /**
     * Get recording info
     */
    getRecordingInfo() {
        return {
            isRecording: this.isRecording,
            isPaused: this.isPaused,
            hasRecording: !!this.audioBlob,
            duration: this.getRecordingDuration(),
            size: this.audioBlob ? this.audioBlob.size : 0,
            sizeInMB: this.audioBlob ? (this.audioBlob.size / (1024 * 1024)).toFixed(2) : 0,
            mimeType: this.mediaRecorder ? this.mediaRecorder.mimeType : null
        };
    }
}

// Export for use in other modules
window.CambridgeAudioRecorder = CambridgeAudioRecorder;
