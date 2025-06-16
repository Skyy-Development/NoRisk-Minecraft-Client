/**
 * Audio analyzer utility for background effects music reactivity
 */

interface AudioData {
  volume: number;        // Overall volume level (0-1)
  bass: number;          // Bass frequency response (0-1)
  mid: number;           // Mid frequency response (0-1)
  treble: number;        // Treble frequency response (0-1)
  spectrum: number[];    // Full frequency spectrum data
  beat: boolean;         // Beat detection flag
  beatStrength: number;  // Strength of detected beat (0-1)
}

class AudioAnalyzer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private dataArray: Uint8Array = new Uint8Array(0);
  private beatDetector: BeatDetector;
  private isInitialized: boolean = false;
  private isEnabled: boolean = false;
  private lastVolume: number = 0;
  private smoothingFactor: number = 0.2; // For smoothing transitions

  // Singleton instance
  private static instance: AudioAnalyzer;

  private constructor() {
    this.beatDetector = new BeatDetector();
  }

  public static getInstance(): AudioAnalyzer {
    if (!AudioAnalyzer.instance) {
      AudioAnalyzer.instance = new AudioAnalyzer();
    }
    return AudioAnalyzer.instance;
  }

  /**
   * Initialize the audio analyzer
   * @returns Promise that resolves when initialization is complete
   */
  public async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      // Request microphone access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      // Create audio context and analyzer
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.source = this.audioContext.createMediaStreamSource(this.mediaStream);
      
      // Configure analyzer
      this.analyser.fftSize = 1024;
      this.analyser.smoothingTimeConstant = 0.85;
      this.source.connect(this.analyser);
      
      // Create data array for frequency data
      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);
      
      this.isInitialized = true;
      console.log("Audio analyzer initialized successfully");
      return true;
    } catch (error) {
      console.error("Failed to initialize audio analyzer:", error);
      this.cleanup();
      return false;
    }
  }

  /**
   * Enable or disable the audio analyzer
   */
  public async setEnabled(enabled: boolean): Promise<boolean> {
    if (enabled === this.isEnabled) return true;
    
    if (enabled) {
      const success = await this.initialize();
      if (success) {
        this.isEnabled = true;
        return true;
      }
      return false;
    } else {
      this.cleanup();
      this.isEnabled = false;
      return true;
    }
  }

  /**
   * Get the current audio data
   */
  public getAudioData(): AudioData | null {
    if (!this.isInitialized || !this.isEnabled || !this.analyser) {
      return null;
    }

    // Get frequency data
    this.analyser.getByteFrequencyData(this.dataArray);
    
    // Calculate volume (average of all frequencies)
    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      sum += this.dataArray[i];
    }
    const rawVolume = sum / this.dataArray.length / 255;
    
    // Apply smoothing to volume
    const volume = this.lastVolume + this.smoothingFactor * (rawVolume - this.lastVolume);
    this.lastVolume = volume;

    // Calculate frequency bands
    // Bass: 0-120Hz (0-5 in a 1024 FFT with 44100Hz sample rate)
    // Mid: 120Hz-2kHz (5-40)
    // Treble: 2kHz-20kHz (40-200)
    const bassEnd = Math.floor(this.dataArray.length * 0.05);
    const midEnd = Math.floor(this.dataArray.length * 0.4);
    
    let bassSum = 0;
    for (let i = 0; i < bassEnd; i++) {
      bassSum += this.dataArray[i];
    }
    const bass = bassSum / bassEnd / 255;
    
    let midSum = 0;
    for (let i = bassEnd; i < midEnd; i++) {
      midSum += this.dataArray[i];
    }
    const mid = midSum / (midEnd - bassEnd) / 255;
    
    let trebleSum = 0;
    for (let i = midEnd; i < this.dataArray.length; i++) {
      trebleSum += this.dataArray[i];
    }
    const treble = trebleSum / (this.dataArray.length - midEnd) / 255;

    // Create normalized spectrum array (0-1 values)
    const spectrum = Array.from(this.dataArray).map(val => val / 255);
    
    // Detect beats
    const beatData = this.beatDetector.detectBeat(bass, mid);

    return {
      volume,
      bass,
      mid,
      treble,
      spectrum,
      beat: beatData.isBeat,
      beatStrength: beatData.strength
    };
  }

  /**
   * Clean up resources
   */
  private cleanup(): void {
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext) {
      if (this.audioContext.state !== 'closed') {
        this.audioContext.close();
      }
      this.audioContext = null;
    }

    this.analyser = null;
    this.isInitialized = false;
  }
}

/**
 * Simple beat detection algorithm
 */
class BeatDetector {
  private energyHistory: number[] = [];
  private lastBeatTime: number = 0;
  private beatThreshold: number = 1.5; // How much energy increase triggers a beat
  private beatHoldTime: number = 100; // Minimum time between beats (ms)
  private beatDecay: number = 0.97; // How quickly the beat decays
  private beatStrength: number = 0;

  constructor(historySize: number = 20) {
    // Initialize energy history with zeros
    this.energyHistory = Array(historySize).fill(0);
  }

  /**
   * Detect if there is a beat in the current audio frame
   */
  public detectBeat(bass: number, mid: number): { isBeat: boolean; strength: number } {
    // Calculate current energy (emphasize bass)
    const currentEnergy = bass * 0.7 + mid * 0.3;
    
    // Add to history and remove oldest entry
    this.energyHistory.push(currentEnergy);
    this.energyHistory.shift();
    
    // Calculate average energy from history
    const avgEnergy = this.energyHistory.reduce((sum, val) => sum + val, 0) / this.energyHistory.length;
    
    // Decay beat strength
    this.beatStrength *= this.beatDecay;
    
    // Check if we have a beat
    const now = Date.now();
    let isBeat = false;
    
    if (currentEnergy > avgEnergy * this.beatThreshold && now - this.lastBeatTime > this.beatHoldTime) {
      // We have a beat!
      isBeat = true;
      this.lastBeatTime = now;
      
      // Calculate beat strength (how much above average)
      const rawStrength = (currentEnergy - avgEnergy) / avgEnergy;
      this.beatStrength = Math.min(1, rawStrength);
    }
    
    return { isBeat, strength: this.beatStrength };
  }
}

export { AudioAnalyzer, type AudioData };