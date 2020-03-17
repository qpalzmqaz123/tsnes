import { uint16, uint8 } from './types';

export interface IMapper {
  read(address: uint16): uint8;
  write(address: uint16, data: uint8): void;
}
