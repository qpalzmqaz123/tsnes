import { IEmulator } from '../src/api/emulator';

const BUFFER_SIZE = 512;

export class Audio {
  public emulator: IEmulator;

  private ctx = new AudioContext();
  private source = this.ctx.createBufferSource();
  private scriptNode = this.ctx.createScriptProcessor(BUFFER_SIZE, 0, 1);
  private buffer = [];

  public start() {
    this.scriptNode.onaudioprocess = e => this.process(e);

    this.source.connect(this.scriptNode);
    this.scriptNode.connect(this.ctx.destination);
    this.source.start();

    setInterval(() => {
      this.waitSample();
    }, 1);
  }

  public get sampleRate(): number {
    return this.ctx.sampleRate;
  }

  public onSample(volume: number): void {
    this.buffer.push(volume);
  }

  private process(e: AudioProcessingEvent) {
    const outputData = e.outputBuffer.getChannelData(0);

    this.waitSample();

    for (let sample = 0; sample < outputData.length; sample++) {
      outputData[sample] =  this.buffer.shift();
    }
  }

  private waitSample(): void {
    while (this.buffer.length < BUFFER_SIZE) {
      this.emulator.clock();
    }
  }
}
