import { IStandardController } from './controller';

export interface IOptions {
  sampleRate: number; // default 48000
  onSample: (volume: number) => void;
  onFrame: (frame: Uint8Array) => void; // frame: [R, G, B, R, G, B, ...] 256 * 240 * 3 = 184320 byes
  sramLoad?: Uint8Array;
}

export interface IEmulator {
  readonly standardController1: IStandardController,
  readonly standardController2: IStandardController,
  readonly sram: Uint8Array;

  clock(): void;
  frame(): void;
}
