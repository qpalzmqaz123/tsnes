import { IController, IMask, IPPU, IStatus, SpriteSize } from '../api/ppu';
import { uint16, uint8 } from '../api/types';
import { IBus } from '../api/bus';
import { Controller } from './controller';
import { Mask } from './mask';
import { Status } from './status';
import { IInterrupt } from '../api/interrupt';
import { IMapper } from '../api/mapper';

enum Register {
  PPUCTRL = 0x2000, // RW
  PPUMASK = 0x2001, // RW
  PPUSTATUS = 0x2002, // R
  OAMADDR	= 0x2003, // W
  OAMDATA	= 0x2004, // RW
  PPUSCROLL	= 0x2005, // W
  PPUADDR	= 0x2006, // W
  PPUDATA	= 0x2007, // RW
}

// PPU internal registers: https://wiki.nesdev.com/w/index.php?title=PPU_scrolling&redirect=no
interface InternalRegister {
  // yyy NN YYYYY XXXXX
  // ||| || ||||| +++++-- coarse X scroll
  // ||| || +++++-------- coarse Y scroll
  // ||| ++-------------- nametable select
  // +++----------------- fine Y scroll
  // Current VRAM address (15 bits), Note that while the v register has 15 bits, the PPU memory space is only 14 bits wide.
  // The highest bit is unused for access through $2007.
  v: number;

  t: number; // Temporary VRAM address (15 bits)
  x: number; // Fine X scroll (3 bits)
  w: number; // First or second write toggle (1 bit)
}

// Refer to: https://wiki.nesdev.com/w/index.php/PPU_rendering
interface ILatchs {
  nameTable: uint8;
  attributeTable: uint8; // 2bit
  lowBackgorundTailByte: uint8;
  highBackgorundTailByte: uint8;
}

interface IShiftRegister {
  lowBackgorundTailBytes: uint16; // Includes tow tail byte
  highBackgorundTailBytes: uint16; // Includes tow tail byte
  lowBackgroundAttributeByes: uint16;
  highBackgroundAttributeByes: uint16;
}

interface ISprite {
  y: uint8;
  tileIndex: uint8;
  attributes: uint8;
  x: uint8;
  isZero: boolean;
}

enum SpriteAttribute {
  PALETTE_L = 0x01,
  PALETTE_H = 0x02,
  PRIORITY = 0x20,
  FLIP_H = 0x40,
  FLIP_V = 0x80,
}

enum SpritePixel {
  PALETTE = 0x3F,
  BEHIND_BG = 0x40,
  ZERO = 0x80,
}

export class PPU implements IPPU {
  public bus: IBus;
  public mapper: IMapper;
  public interrupt: IInterrupt;

  public pixels: Uint8Array = new Uint8Array(256 * 240); // NES color
  public oamMemory: Uint8Array = new Uint8Array(256);

  private controller: IController = new Controller();
  private mask: IMask = new Mask();
  private register: InternalRegister = {v: 0, t: 0, x: 0, w: 0};
  private shiftRegister: IShiftRegister = {} as any;
  private latchs: ILatchs = {} as any;
  private status: IStatus = new Status();
  private nmiDelay = 0;

  // The PPUDATA read buffer (post-fetch): https://wiki.nesdev.com/w/index.php/PPU_registers#The_PPUDATA_read_buffer_.28post-fetch.29
  private readBuffer = 0;

  private frame = 0; // Frame counter
  private scanLine = 240; // 0 ~ 261
  private cycle = 340; // 0 ~ 340

  private oamAddress: uint8;
  private secondaryOam: ISprite[] = Array(8).fill(0).map(() => Object.create(null));
  private spritePixels: number[] = new Array(256);

  // Least significant bits previously written into a PPU register
  private previousData = 0;

  constructor(
    private readonly onFrame: (frame: Uint8Array) => void, // frame: PPU palette pixels
  ) {}

  // PPU timing: https://wiki.nesdev.com/w/images/4/4f/Ppu.svg
  public clock(): void {
    // For odd frames, the cycle at the end of the scanline is skipped (this is done internally by jumping directly from (339,261) to (0,0)
    // However, this behavior can be bypassed by keeping rendering disabled until after this scanline has passed
    if (this.scanLine === 261 && this.cycle === 339 && this.frame & 0x01 && (this.mask.isShowBackground || this.mask.isShowSprite)) {
      this.updateCycle();
    }

    this.updateCycle();

    if (!this.mask.isShowBackground && !this.mask.isShowSprite) {
      return;
    }

    // Scanline 0 - 239: visible lines
    if (0 <= this.scanLine && this.scanLine <= 239) {
      // Cycle 0: do nothing

      // Cycle 1 - 64: Clear secondary OAM
      if (1 === this.cycle) {
        this.clearSecondaryOam();
      }

      // Cycle 65 - 256: Sprite evaluation for next scanline
      if (65 === this.cycle) {
        this.evalSprite();
      }

      // Cycle 1 - 256: fetch NT, AT, tile
      if (1 <= this.cycle && this.cycle <= 256) {
        this.shiftBackground();
        this.renderPixel();
        this.fetchTileRelatedData();
      }

      // Cycle 256
      if (this.cycle === 256) {
        this.incrementVerticalPosition();
      }

      // Cycle 257
      if (this.cycle === 257) {
        this.copyHorizontalBits();
      }

      // Cycle 257 - 320: Sprite fetches
      if (this.cycle === 257) {
        this.fetchSprite();
      }

      // Cycle 321 - 336: fetch NT, AT, tile
      if (321 <= this.cycle && this.cycle <= 336) {
        this.shiftBackground();
        this.fetchTileRelatedData();
      }

      // Cycle 337 - 340: unused NT fetches
    }

    // Scanline 240 - 260: Do nothing

    // Scanline 261: pre render line
    if (this.scanLine === 261) {
      // Cycle 0: do nothing

      // Cycle 1 - 256: fetch NT, AT, tile
      if (1 <= this.cycle && this.cycle <= 256) {
        this.shiftBackground();
        this.fetchTileRelatedData();
      }

      // Cycle 256
      if (this.cycle === 256) {
        this.incrementVerticalPosition();
      }

      // Cycle 257
      if (this.cycle === 257) {
        this.copyHorizontalBits();
      }

      // Cycle 257 - 320: do nothing

      // Cycle 280
      if (this.cycle === 280) {
        this.copyVerticalBits();
      }

      // Cycle 321 - 336: fetch NT, AT, tile
      if (321 <= this.cycle && this.cycle <= 336) {
        this.shiftBackground();
        this.fetchTileRelatedData();
      }
    }
  }

  public cpuRead(address: uint16): uint8 {
    switch (address) {
      case Register.PPUCTRL:
        return this.readCtrl();
      case Register.PPUMASK:
        return this.readMask();
      case Register.PPUSTATUS:
        return this.readStatus();
      case Register.OAMADDR:
        return 0;
      case Register.OAMDATA:
        return this.readOAMData();
      case Register.PPUSCROLL:
        return 0;
      case Register.PPUADDR:
        return 0;
      case Register.PPUDATA:
        return this.readPPUData();
    }
  }

  public cpuWrite(address: uint16, data: uint8): void {
    data &= 0xFF;
    this.previousData = data & 0x1F;

    switch (address) {
      case Register.PPUCTRL:
        this.writeCtrl(data);
        break;
      case Register.PPUMASK:
        this.writeMask(data);
        break;
      case Register.PPUSTATUS:
        break;
      case Register.OAMADDR:
        this.writeOAMAddr(data);
        break;
      case Register.OAMDATA:
        this.writeOAMData(data);
        break;
      case Register.PPUSCROLL:
        this.writeScroll(data);
        break;
      case Register.PPUADDR:
        this.writePPUAddr(data);
        break;
      case Register.PPUDATA:
        this.writePPUData(data);
        break;
    }
  }

  public dmaCopy(data: Uint8Array) {
    for (let i = 0; i < 256; i++) {
      this.oamMemory[(i + this.oamAddress) & 0xFF] = data[i];
    }
  }

  private writeCtrl(data: uint8): void {
    this.controller.data = data;

    // t: ....BA.. ........ = d: ......BA
    this.register.t = this.register.t & 0xF3FF | (data & 0x03) << 10;
  }

  private readCtrl(): uint8 {
    return this.controller.data;
  }

  private writeMask(data: uint8): void {
    this.mask.data = data;
  }

  private readMask(): uint8 {
    return this.mask.data;
  }

  private readStatus(): uint8 {
    const data = this.status.data | this.previousData;

    // Clear VBlank flag
    this.status.isVBlankStarted = false;

    // w:                  = 0
    this.register.w = 0;

    return data;
  }

  private writeOAMAddr(data: uint8): void {
    this.oamAddress = data;
  }

  private readOAMData(): uint8 {
    return this.oamMemory[this.oamAddress];
  }

  private writeOAMData(data: uint8): void {
    this.oamMemory[this.oamAddress++ & 0xFF] = data;
  }

  private writeScroll(data: uint8): void {
    if (this.register.w === 0) {
      // t: ....... ...HGFED = d: HGFED...
      // x:              CBA = d: .....CBA
      // w:                  = 1
      this.register.t = this.register.t & 0xFFE0 | data >> 3;
      this.register.x = data & 0x07;
      this.register.w = 1;
    } else {
      // t: CBA..HG FED..... = d: HGFEDCBA
      // w:                  = 0
      this.register.t = this.register.t & 0x0C1F | (data & 0x07) << 12 | (data & 0xF8) << 2;
      this.register.w = 0;
    }
  }

  private writePPUAddr(data: uint8): void {
    if (this.register.w === 0) {
      // t: .FEDCBA ........ = d: ..FEDCBA
      // t: X...... ........ = 0
      // w:                  = 1
      this.register.t = this.register.t & 0x80FF | (data & 0x3F) << 8;
      this.register.w = 1;
    } else {
      // t: ....... HGFEDCBA = d: HGFEDCBA
      // v                   = t
      // w:                  = 0
      this.register.t = this.register.t & 0xFF00 | data;
      this.register.v = this.register.t;
      this.register.w = 0;
    }
  }

  private readPPUData(): uint8 {
    let data = this.bus.readByte(this.register.v);

    if (this.register.v <= 0x3EFF) { // Buffered read
      const tmp = this.readBuffer;
      this.readBuffer = data;
      data = tmp;
    } else {
      this.readBuffer = this.bus.readByte(this.register.v - 0x1000);
    }

    this.register.v += this.controller.vramIncrementStepSize;
    this.register.v &= 0x7FFF;

    return data;
  }

  private writePPUData(data: uint8): void {
    this.bus.writeByte(this.register.v, data);

    this.register.v += this.controller.vramIncrementStepSize;
  }

  private updateCycle(): void {
    if (this.status.isVBlankStarted && this.controller.isNMIEnabled && this.nmiDelay-- === 0) {
        this.interrupt.nmi();
    }

    this.cycle++;
    if (this.cycle > 340) {
      this.cycle = 0;
      this.scanLine++;
      if (this.scanLine > 261) {
        this.scanLine = 0;
        this.frame++;

        this.onFrame(this.pixels);
      }
    }

    // Set VBlank flag
    if (this.scanLine === 241 && this.cycle === 1) {
      this.status.isVBlankStarted = true;

      // Trigger NMI
      if (this.controller.isNMIEnabled) {
        this.nmiDelay = 15;
      }
    }

    // Clear VBlank flag and Sprite0 Overflow
    if (this.scanLine === 261 && this.cycle === 1) {
      this.status.isVBlankStarted = false;
      this.status.isZeroSpriteHit = false;
      this.status.isSpriteOverflow = false;
    }

    if (this.mask.isShowBackground || this.mask.isShowSprite) {
      this.mapper.ppuClockHandle(this.scanLine, this.cycle);
    }
  }

  private fetchTileRelatedData() {
    if (!this.mask.isShowBackground) {
      return;
    }

    switch (this.cycle % 8) {
      case 1:
        this.loadBackground();
        this.fetchNameTable();
        break;
      case 3:
        this.fetchAttributeTable();
        break;
      case 5:
        this.fetchLowBackgroundTileByte();
        break;
      case 7:
        this.fetchHighBackgroundTileByte();
        break;
      case 0:
        this.incrementHorizontalPosition();
        break;
    }
  }

  private fetchNameTable() {
    const address = 0x2000 | (this.register.v & 0x0FFF);

    this.latchs.nameTable = this.bus.readByte(address);
  }

  private fetchAttributeTable() {
    const address = 0x23C0 |
      (this.register.v & 0x0C00) |
      ((this.register.v >> 4) & 0x38) |
      ((this.register.v >> 2) & 0x07);

    const isRight = !!(this.register.v & 0x02);
    const isBottom = !!(this.register.v & 0x40);

    const offset = (isBottom ? 0x02 : 0) | (isRight ? 0x01 : 0);

    this.latchs.attributeTable = this.bus.readByte(address) >> (offset << 1) & 0x03;
  }

  private fetchLowBackgroundTileByte() {
    const address = this.controller.backgroundPatternTableAddress +
      this.latchs.nameTable * 16 +
      (this.register.v >> 12 & 0x07);

    this.latchs.lowBackgorundTailByte = this.bus.readByte(address);
  }

  private fetchHighBackgroundTileByte() {
    const address = this.controller.backgroundPatternTableAddress +
      this.latchs.nameTable * 16 +
      (this.register.v >> 12 & 0x07) + 8;

    this.latchs.highBackgorundTailByte = this.bus.readByte(address);
  }

  private loadBackground() {
    this.shiftRegister.lowBackgorundTailBytes |= this.latchs.lowBackgorundTailByte;
    this.shiftRegister.highBackgorundTailBytes |= this.latchs.highBackgorundTailByte;
    this.shiftRegister.lowBackgroundAttributeByes |= (this.latchs.attributeTable & 0x01) ? 0xFF : 0;
    this.shiftRegister.highBackgroundAttributeByes |= (this.latchs.attributeTable & 0x02) ? 0xFF : 0;
  }

  private shiftBackground() {
    if (!this.mask.isShowBackground) {
      return;
    }

    this.shiftRegister.lowBackgorundTailBytes <<= 1;
    this.shiftRegister.highBackgorundTailBytes <<= 1;
    this.shiftRegister.lowBackgroundAttributeByes <<= 1;
    this.shiftRegister.highBackgroundAttributeByes <<= 1;
  }

  // Between cycle 328 of a scanline, and 256 of the next scanline
  private incrementHorizontalPosition(): void {
    if ((this.register.v & 0x001F) === 31) {
      this.register.v &= ~0x001F;
      this.register.v ^= 0x0400;
    } else {
      this.register.v += 1;
    }
  }

  // At cycle 256 of each scanline
  private incrementVerticalPosition(): void {
    if ((this.register.v & 0x7000) !== 0x7000) {
      this.register.v += 0x1000;
    } else {
      this.register.v &= ~0x7000;
      let y = (this.register.v & 0x03E0) >> 5;
      if (y === 29) {
        y = 0;
        this.register.v ^= 0x0800;
      } else if (y === 31) {
        y = 0;
      } else {
        y += 1;
      }
      this.register.v = (this.register.v & ~0x03E0) | (y << 5);
    }
  }

  // At cycle 257 of each scanline
  private copyHorizontalBits(): void {
    // v: ....F.. ...EDCBA = t: ....F.. ...EDCBA
    this.register.v = (this.register.v & 0b1111101111100000) | (this.register.t & ~0b1111101111100000) & 0x7FFF;
  }

  // During cycles 280 to 304 of the pre-render scanline (end of vblank)
  private copyVerticalBits(): void {
    // v: IHGF.ED CBA..... = t: IHGF.ED CBA.....
    this.register.v = (this.register.v & 0b1000010000011111) | (this.register.t & ~0b1000010000011111) & 0x7FFF;
  }

  private renderPixel(): void {
    const x = this.cycle - 1;
    const y = this.scanLine;

    const offset = 0x8000 >> this.register.x;
    const bit0 = this.shiftRegister.lowBackgorundTailBytes & offset ? 1 : 0;
    const bit1 = this.shiftRegister.highBackgorundTailBytes & offset ? 1 : 0;
    const bit2 = this.shiftRegister.lowBackgroundAttributeByes & offset ? 1 : 0;
    const bit3 = this.shiftRegister.highBackgroundAttributeByes & offset ? 1 : 0;

    const paletteIndex = bit3 << 3 | bit2 << 2 | bit1 << 1 | bit0 << 0;
    const spritePaletteIndex = this.spritePixels[x] & SpritePixel.PALETTE;

    const isTransparentSprite = spritePaletteIndex % 4 === 0 || !this.mask.isShowSprite;
    const isTransparentBackground = paletteIndex % 4 === 0 || !this.mask.isShowBackground;

    let address = 0x3F00;
    if (isTransparentBackground) {
      if (isTransparentSprite) {
        // Do nothing
      } else {
        address = 0x3F10 + spritePaletteIndex;
      }
    } else {
      if (isTransparentSprite) {
        address = 0x3F00 + paletteIndex;
      } else {
        // Sprite 0 hit does not happen:
        //   - If background or sprite rendering is disabled in PPUMASK ($2001)
        //   - At x=0 to x=7 if the left-side clipping window is enabled (if bit 2 or bit 1 of PPUMASK is 0).
        //   - At x=255, for an obscure reason related to the pixel pipeline.
        //   - At any pixel where the background or sprite pixel is transparent (2-bit color index from the CHR pattern is %00).
        //   - If sprite 0 hit has already occurred this frame. Bit 6 of PPUSTATUS ($2002) is cleared to 0 at dot 1 of the pre-render line.
        //     This means only the first sprite 0 hit in a frame can be detected.
        if (this.spritePixels[x] & SpritePixel.ZERO) {
          if (
            (!this.mask.isShowBackground || !this.mask.isShowSprite) ||
            (0 <= x && x <= 7 && (!this.mask.isShowSpriteLeft8px || !this.mask.isShowBackgroundLeft8px)) ||
            x === 255
            // TODO: Only the first sprite 0 hit in a frame can be detected.
          ) {
            // Sprite 0 hit does not happen
          } else {
            this.status.isZeroSpriteHit = true;
          }
        }
        address = this.spritePixels[x] & SpritePixel.BEHIND_BG ? 0x3F00 + paletteIndex : 0x3F10 + spritePaletteIndex;
      }
    }

    this.pixels[x + y * 256] = this.bus.readByte(address);
  }

  private clearSecondaryOam() {
    if (!this.mask.isShowSprite) {
      return;
    }

    this.secondaryOam.forEach(oam => {
      oam.attributes = 0xFF;
      oam.tileIndex = 0xFF;
      oam.x = 0xFF;
      oam.y = 0xFF;
    });
  }

  private evalSprite() {
    if (!this.mask.isShowSprite) {
      return;
    }

    let spriteCount = 0;

    // Find eligible sprites
    for (let i = 0; i < 64; i++) {
      const y = this.oamMemory[i * 4];
      if (this.scanLine < y || (this.scanLine >= y + this.controller.spriteSize)) {
        continue;
      }

      // Overflow?
      if (spriteCount === 8) {
        this.status.isSpriteOverflow = true;
        break;
      }

      const oam = this.secondaryOam[spriteCount++];
      oam.y = y;
      oam.tileIndex = this.oamMemory[i * 4 + 1];
      oam.attributes = this.oamMemory[i * 4 + 2];
      oam.x = this.oamMemory[i * 4 + 3];
      oam.isZero = i === 0;
    }
  }

  private fetchSprite() {
    if (!this.mask.isShowSprite) {
      return;
    }

    this.spritePixels.fill(0);

    for (const sprite of this.secondaryOam.reverse()) {
      // Hidden sprite?
      if (sprite.y >= 0xEF) {
        continue;
      }

      const isBehind = !!(sprite.attributes & SpriteAttribute.PRIORITY);
      const isZero = sprite.isZero;
      const isFlipH = !!(sprite.attributes & SpriteAttribute.FLIP_H);
      const isFlipV = !!(sprite.attributes & SpriteAttribute.FLIP_V);

      // Caculate tile address
      let address: uint16;
      if (this.controller.spriteSize === SpriteSize.SIZE_8X8) {
        const baseAddress = this.controller.spritePatternTableAddress + (sprite.tileIndex << 4);
        const offset = isFlipV ? (7 - this.scanLine + sprite.y) : (this.scanLine - sprite.y);
        address = baseAddress + offset;
      } else {
        const baseAddress = ((sprite.tileIndex & 0x01) ? 0x1000 : 0x0000) + ((sprite.tileIndex & 0xFE) << 4);
        const offset = isFlipV ? (15 - this.scanLine + sprite.y) : (this.scanLine - sprite.y);
        address = baseAddress + offset % 8 + Math.floor(offset / 8) * 16;
      }

      // Fetch tile data
      const tileL = this.bus.readByte(address);
      const tileH = this.bus.readByte(address + 8);

      // Generate sprite pixels
      for (let i = 0; i < 8; i++) {
        const b = isFlipH ? 0x01 << i : 0x80 >> i;

        const bit0 = tileL & b ? 1 : 0;
        const bit1 = tileH & b ? 1 : 0;
        const bit2 = sprite.attributes & SpriteAttribute.PALETTE_L ? 1 : 0;
        const bit3 = sprite.attributes & SpriteAttribute.PALETTE_H ? 1 : 0;
        const index = bit3 << 3 | bit2 << 2 | bit1 << 1 | bit0;

        if (index % 4 === 0 && (this.spritePixels[sprite.x + i] & SpritePixel.PALETTE) % 4 !== 0) {
          continue;
        }

        this.spritePixels[sprite.x + i] = index |
          (isBehind ? SpritePixel.BEHIND_BG : 0) |
          (isZero ? SpritePixel.ZERO : 0);
      }
    }
  }
}
