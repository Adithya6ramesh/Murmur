const API_BASE =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE
    ? import.meta.env.VITE_API_BASE
    : 'http://127.0.0.1:5000/api/v1';

export class MurmurAPI {
  constructor() {
    this.baseURL = API_BASE.replace(/\/$/, '');
    this.timeout = 30000;
  }

  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;

    const defaultOptions = {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      timeout: this.timeout,
    };

    const requestOptions = { ...defaultOptions, ...options };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        ...requestOptions,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timed out');
      }
      throw error;
    }
  }

  async healthCheck() {
    return this.makeRequest('/health');
  }

  async getAPIInfo() {
    return this.makeRequest('/info');
  }

  async transcribeAudio(audioBlob, filename = 'recording.wav') {
    const formData = new FormData();
    formData.append('audio', audioBlob, filename);

    return this.makeRequest('/journal/transcript-only', {
      method: 'POST',
      body: formData,
    });
  }

  async analyzeJournal(audioBlob, filename = 'recording.wav') {
    const formData = new FormData();
    formData.append('audio', audioBlob, filename);

    return this.makeRequest('/journal/analyze', {
      method: 'POST',
      body: formData,
    });
  }

  async isAPIAvailable() {
    try {
      await this.healthCheck();
      return true;
    } catch {
      return false;
    }
  }

  handleAPIError(error) {
    if (error.message.includes('Failed to fetch')) {
      return 'Unable to connect to the server. Please check if the Murmur backend is running.';
    }
    if (error.message.includes('timed out')) {
      return 'Request timed out. The server might be busy processing your request.';
    }
    if (error.message.includes('413')) {
      return 'File too large. Please try with a smaller audio file.';
    }
    if (error.message.includes('400')) {
      return 'Invalid request. Please check your audio file format.';
    }
    if (error.message.includes('500')) {
      return 'Server error. Please try again later.';
    }
    return `An error occurred: ${error.message}`;
  }
}

export const AudioUtils = {
  getSupportedFormats() {
    return ['wav', 'mp3', 'flac', 'm4a', 'ogg', 'webm'];
  },
  isValidAudioFile(file) {
    if (!file) return false;
    const validTypes = [
      'audio/wav',
      'audio/wave',
      'audio/x-wav',
      'audio/mpeg',
      'audio/mp3',
      'audio/flac',
      'audio/x-flac',
      'audio/mp4',
      'audio/m4a',
      'audio/ogg',
      'audio/webm',
    ];
    return validTypes.includes(file.type);
  },
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
  },
};
