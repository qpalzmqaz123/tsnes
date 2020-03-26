import { IEmulator } from '../src/api/emulator';

export class Screen {
  public emulator: IEmulator;
  public isTrimBorder = true;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly scaleFactor = 3,
    private readonly context = canvas.getContext('2d'),
    private readonly screenImgData = context.createImageData(256 * scaleFactor, 240 * scaleFactor),
  ) {
    this.canvas.height = 240 * scaleFactor;
    this.canvas.width = 256 * scaleFactor;
  }

  public onFrame(frame: Uint8Array): void {
    let ptr = 0;
    for (let y = 0; y < 240; y++) {
      if (this.isTrimBorder &&
        (0 <= y && y <= 7 || 232 <= y && y <= 239)
      ) {
        continue;
      }

      for (let i = 0; i < this.scaleFactor; i++) {
        for (let x = 0; x < 256; x++) {
          const offset = (y * 256 + x) * 3;

          for (let j = 0; j < this.scaleFactor; j++) {
            this.screenImgData.data[ptr++] = frame[offset];
            this.screenImgData.data[ptr++] = frame[offset + 1];
            this.screenImgData.data[ptr++] = frame[offset + 2];
            this.screenImgData.data[ptr++] = 255;
          }
        }
      }
    }

    this.context.putImageData(this.screenImgData,0,0);
  }
}
