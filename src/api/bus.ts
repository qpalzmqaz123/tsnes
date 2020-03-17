import { uint16, uint8 } from './types';

export interface IBus {
  writeByte(address: uint16, data: uint8): void;
  writeWord(address: uint16, data: uint16): void;
  readByte(address: uint16): uint8;
  readWord(address: uint16): uint16;
}
