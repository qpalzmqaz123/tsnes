import { uint16, uint8 } from './types';

export interface IChannel {
  readonly volume: uint8;
  isEnabled: boolean;
  lengthCounter: uint8;
  clock(): void;
  processEnvelope(): void;
  processLinearCounter(): void;
  processLengthCounter(): void;
  processSweep(): void;
  write(offset: uint16, data: uint8): void;
}

export interface IAPU {
  clock(): void;
  read(address: uint16): uint8;
  write(address: uint16, data: uint8): void;
}
