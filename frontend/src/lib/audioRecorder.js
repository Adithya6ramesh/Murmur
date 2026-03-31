const BAR_COUNT = 11;

/**
 * Same behavior as the legacy AudioRecorder: MediaRecorder + analyser-driven levels for UI.
 * @param {(heights: number[]) => void} onLevelUpdate — heights in px for each bar (idle ~10)
 */
export class AudioRecorder {
  constructor(onLevelUpdate) {
    this.onLevelUpdate = onLevelUpdate;
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.stream = null;
    this.isRecording = false;
    this.audioContext = null;
    this.analyser = null;
    this.animationId = null;
  }

  async startRecording() {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    this.mediaRecorder = new MediaRecorder(this.stream, {
      mimeType: this.getSupportedMimeType(),
    });

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    this.mediaRecorder.onstop = () => {
      this.stopVisualization();
    };

    this.audioChunks = [];
    this.mediaRecorder.start(100);
    this.isRecording = true;
    this.startVisualization();
  }

  async stopRecording() {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || !this.isRecording) {
        reject(new Error('No active recording'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, {
          type: this.getSupportedMimeType(),
        });

        if (this.stream) {
          this.stream.getTracks().forEach((track) => track.stop());
        }

        this.stopVisualization();
        this.isRecording = false;
        this.audioChunks = [];
        resolve(audioBlob);
      };

      this.mediaRecorder.stop();
    });
  }

  getSupportedMimeType() {
    const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/wav'];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return 'audio/webm';
  }

  startVisualization() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      const source = this.audioContext.createMediaStreamSource(this.stream);
      source.connect(this.analyser);
      this.analyser.fftSize = 256;
      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const visualize = () => {
        if (!this.isRecording) return;
        this.animationId = requestAnimationFrame(visualize);
        this.analyser.getByteFrequencyData(dataArray);
        this.emitLevels(dataArray);
      };
      visualize();
    } catch (e) {
      console.error('Error starting visualization:', e);
    }
  }

  emitLevels(dataArray) {
    if (!this.onLevelUpdate) return;
    const step = Math.floor(dataArray.length / BAR_COUNT);
    const heights = [];
    for (let i = 0; i < BAR_COUNT; i++) {
      const dataIndex = i * step;
      const amplitude = dataArray[dataIndex] || 0;
      const height = Math.max(10, (amplitude / 255) * 50 + 10);
      heights.push(height);
    }
    this.onLevelUpdate(heights);
  }

  stopVisualization() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    if (this.onLevelUpdate) {
      this.onLevelUpdate(Array(BAR_COUNT).fill(10));
    }
  }

  static isSupported() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
  }
}
