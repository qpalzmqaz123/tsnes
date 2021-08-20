import { IEmulator } from '../src/api/emulator';

const BUFFER_SIZE = 2048;

export class Audio {
  public emulator: IEmulator;

  private ctx = new AudioContext({
    sampleRate: 44100,
  });
  private source = this.ctx.createBufferSource();
  private scriptNode = this.ctx.createScriptProcessor(BUFFER_SIZE, 0, 1);
  private buffer = [];

  public start() {
    this.scriptNode.onaudioprocess = e => this.process(e);

    this.source.connect(this.scriptNode);
    this.scriptNode.connect(this.ctx.destination);
    this.source.start();
  }

  public get sampleRate(): number {
    return this.ctx.sampleRate;
  }

  public onSample(volume: number): void {
    this.buffer.push(volume);
  }

  private process(e: AudioProcessingEvent) {
    const outputData = e.outputBuffer.getChannelData(0);

    if (this.buffer.length >= outputData.length) {
      for (let sample = 0; sample < outputData.length; sample++) {
        outputData[sample] = this.buffer.shift();
      }
    } else {
      // Scale
      for (let sample = 0; sample < outputData.length; sample++) {
        outputData[sample] = this.buffer[parseInt((sample * this.buffer.length / outputData.length) as any, 10)];
      }

      this.buffer = [];
    }
  }
}
