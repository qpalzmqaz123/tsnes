import { uint16, uint8 } from './types';
import { IInterrupt } from './interrupt';

export interface IMapper {
  read(address: uint16): uint8;
  write(address: uint16, data: uint8): void;
  ppuClockHandle(scanLine: number, cycle: number);
  interrupt: IInterrupt;
}
