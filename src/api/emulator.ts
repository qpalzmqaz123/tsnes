import { IStandardController } from './controller';

export interface IEmulator {
  readonly standardController1: IStandardController,
  readonly standardController2: IStandardController,
  frame(): void;
  getImage(): Uint8Array; // [R, G, B, R, G, B, ...]
}
