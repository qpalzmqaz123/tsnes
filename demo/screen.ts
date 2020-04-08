import { IEmulator } from '../src/api/emulator';

export class Screen {
  public emulator: IEmulator;
  public isTrimBorder = true;

  private readonly hiddenCanvasElement;
  private readonly hiddenCanvasContext;
  private readonly hiddenScreenImgData;
  private readonly hiddenImage = new Image();

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly context = canvas.getContext('2d'),
  ) {
    this.context.scale(3, 3);
    this.context.imageSmoothingEnabled = false;
    this.hiddenImage.onload = () => this.context.drawImage(this.hiddenImage, 0, 0);

    this.hiddenCanvasElement = document.createElement('canvas');
    this.hiddenCanvasElement.width = '256';
    this.hiddenCanvasElement.height = '240';
    this.hiddenCanvasContext = this.hiddenCanvasElement.getContext('2d');
    this.hiddenScreenImgData = this.hiddenCanvasContext.createImageData(256, 240);
  }

  public onFrame(frame: Uint8Array): void {
    let ptr = 0;
    for (let y = 0; y < 240; y++) {
      if (this.isTrimBorder &&
        (0 <= y && y <= 7 || 232 <= y && y <= 239)
      ) {
        continue;
      }

      for (let x = 0; x < 256; x++) {
        const offset = (y * 256 + x) * 3;

        this.hiddenScreenImgData.data[ptr++] = frame[offset];
        this.hiddenScreenImgData.data[ptr++] = frame[offset + 1];
        this.hiddenScreenImgData.data[ptr++] = frame[offset + 2];
        this.hiddenScreenImgData.data[ptr++] = 255;
      }
    }

    this.hiddenCanvasContext.putImageData(this.hiddenScreenImgData,0,0);

    // Draw image
    this.hiddenImage.src = this.hiddenCanvasElement.toDataURL();
  }
}
