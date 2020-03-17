import { IBus } from '../api/bus';
import { uint16, uint8 } from '../api/types';
import { IRAM } from '../api/ram';
import { ICartridge, Mirror } from '../api/cartridge';

// PPU memory map: https://wiki.nesdev.com/w/index.php/PPU_memory_map
export class PPUBus implements IBus {
  public cartridge: ICartridge;
  public ram: IRAM; // 2K
  public backgroundPallette: IRAM; // 16B
  public spritePallette: IRAM; // 16B

  public readByte(address: uint16): uint8 {
    address &= 0x3FFF;

    if (address < 0x2000) {
      // Pattern table 0 - 1
      return this.cartridge.mapper.read(address);
    } else if (address < 0x3000) {
      // Nametable 0 - 3
      return this.ram.read(this.parseMirrorAddress(address));
    } else if (address < 0x3F00) {
      // Mirrors of $2000-$2EFF
      return this.readByte(address - 0x1000);
    } else {
      // Palette RAM indexes
      address &= 0x3F1F;

      if (address < 0x3F10) { // Background pallette
        return this.backgroundPallette.read(address);
      } else { // Sprite pallette
        // Refer to https://wiki.nesdev.com/w/index.php/PPU_palettes
        // Addresses $3F10/$3F14/$3F18/$3F1C are mirrors of $3F00/$3F04/$3F08/$3F0C
        if (!(address & 0b11)) {
          address -= 0x10;
          return this.backgroundPallette.read(address);
        }

        return this.spritePallette.read(address);
      }
    }
  }

  public writeByte(address: uint16, data: uint8): void {
    address &= 0x3FFF;

    if (address < 0x2000) {
      // Pattern table 0 - 1
      this.cartridge.mapper.write(address, data);
    } else if (address < 0x3000) {
      // Nametable 0 - 3
      this.ram.write(this.parseMirrorAddress(address), data);
    } else if (address < 0x3F00) {
      // Mirrors of $2000-$2EFF
      return this.writeByte(address - 0x1000, data);
    } else {
      // Palette RAM indexes
      address &= 0x3F1F;

      if (address < 0x3F10) { // Background pallette
        this.backgroundPallette.write(address, data);
      } else { // Sprite pallette
        // Refer to https://wiki.nesdev.com/w/index.php/PPU_palettes
        // Addresses $3F10/$3F14/$3F18/$3F1C are mirrors of $3F00/$3F04/$3F08/$3F0C
        if (!(address & 0b11)) {
          address -= 0x10;
          return this.backgroundPallette.write(address, data);
        }

        this.spritePallette.write(address, data);
      }
    }
  }

  public readWord(address: uint16): uint16 {
    return this.readByte(address + 1) << 8 | this.readByte(address);
  }

  public writeWord(address: uint16, data: uint16): void {
    this.writeByte(address, data);
    this.writeByte(address + 1, data >> 8)
  }

  private parseMirrorAddress(address: uint16): uint16 {
    switch (this.cartridge.info.mirror) {
      case Mirror.HORIZONTAL:
        return (address & 0b0010_0011_1111_1111) | (address & 0b0000_1000_0000_0000 ? 0b0000_0100_0000_0000 : 0);
      case Mirror.VERTICAL:
        return address & 0x27FF;
      case Mirror.FOUR_SCREEN:
      default:
        throw new Error(`Invalid mirror type: '${this.cartridge.info.mirror}'`);
    }
  }
}
