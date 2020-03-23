const BUFFER_SIZE = 2048;

export class Audio {
  private ctx = new AudioContext();
  private source = this.ctx.createBufferSource();
  private scriptNode = this.ctx.createScriptProcessor(BUFFER_SIZE, 0, 1);
  private buffer = [];

  constructor() {
    this.scriptNode.onaudioprocess = e => this.process(e);

    this.source.connect(this.scriptNode);
    this.scriptNode.connect(this.ctx.destination);
    this.source.start();
  }

  public get sampleRate(): number {
    return this.ctx.sampleRate;
  }

  public onSample(volume: number): void {
    if (this.buffer.length > BUFFER_SIZE << 3) {
      return;
    }
    this.buffer.push(volume);
  }

  private process(e: AudioProcessingEvent) {
    const outputData = e.outputBuffer.getChannelData(0);

    if (this.buffer.length >= outputData.length) {
      for (let sample = 0; sample < outputData.length; sample++) {
        outputData[sample] =  this.buffer.shift();
      }
    } else {
      for (let sample = 0; sample < outputData.length; sample++) {
        outputData[sample] = this.buffer[Math.floor(sample * this.buffer.length / outputData.length)];
      }
      this.buffer = [];
    }
  }
}
