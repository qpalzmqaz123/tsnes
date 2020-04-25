import { IStandardController } from './controller';

export interface IOptions {
  sampleRate: number; // default 48000
  onSample: (volume: number) => void;
  onFrame: (frame: Uint32Array) => void; // frame: Uint32 RGB Array, length = 256 * 240 = 61440
  sramLoad?: Uint8Array;
}

export interface IEmulator {
  readonly standardController1: IStandardController,
  readonly standardController2: IStandardController,
  readonly sram: Uint8Array;

  clock(): void;
  frame(): void;
}
