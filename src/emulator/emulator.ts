import { CPUBus } from '../bus/cpu-bus';
import { IBus } from '../api/bus';
import { ICPU } from '../api/cpu';
import { CPU } from '../cpu/cpu';
import { Cartridge } from '../cartridge/cartridge';
import { RAM } from '../ram/ram';
import { IRAM } from '../api/ram';
import { PPU } from '../ppu/ppu';
import { IPPU } from '../api/ppu';
import { IEmulator } from '../api/emulator';
import { PPUBus } from '../bus/ppu-bus';
import { getColor } from './palettes';
import { DMA } from '../dma/dma';
import { IDMA } from '../api/dma';
import { ICartridge } from '../api/cartridge';
import { IStandardController } from '../api/controller';
import { StandardController } from '../controller/standard-controller';
import { Interrupt } from '../interrupt/interrupt';
import { IInterrupt } from '../api/interrupt';

export class Emulator implements IEmulator {
  public readonly standardController1: IStandardController;
  public readonly standardController2: IStandardController;

  private readonly cpu: ICPU;
  private readonly ppu: IPPU;
  private readonly cartridge: ICartridge;
  private readonly ppuRam: IRAM;
  private readonly cpuRam: IRAM;
  private readonly cpuBus: IBus;
  private readonly ppuBus: IBus;
  private readonly backgroundPalette: IRAM;
  private readonly spritePalette: IRAM;
  private readonly dma: IDMA;
  private readonly interrupt: IInterrupt;

  constructor(nesData: Uint8Array) {
    const standardController1 = new StandardController();
    const standardController2 = new StandardController();
    const cartridge = new Cartridge(nesData);
    const ppuRam = new RAM(1024 * 2, 0x2000); // 0x2000 ~ 0x2800
    const cpuRam = new RAM(1024 * 2, 0); // 0x0000 ~ 0x0800
    const backgroundPalette = new RAM(16, 0x3F00); // 0x3F00 ~ 0x3F10
    const spritePalette = new RAM(16, 0x3F10); // 0x3F10 ~ 0x3F20
    const dma = new DMA();
    const ppuBus = new PPUBus();
    const ppu = new PPU();
    const cpuBus = new CPUBus();
    const cpu = new CPU();
    const interrupt = new Interrupt();

    cpu.bus = cpuBus;

    ppu.interrupt = interrupt;
    ppu.bus = ppuBus;

    dma.cpuBus = cpuBus;
    dma.oamData = ppu.oamMemory;

    interrupt.cpu = cpu;

    ppuBus.cartridge = cartridge;
    ppuBus.ram = ppuRam;
    ppuBus.backgroundPallette = backgroundPalette;
    ppuBus.spritePallette = spritePalette;

    cpuBus.cartridge = cartridge;
    cpuBus.ram = cpuRam;
    cpuBus.ppu = ppu;
    cpuBus.dma = dma;
    cpuBus.controller1 = standardController1;
    cpuBus.controller2 = standardController2;

    this.cpu = cpu;
    this.ppu = ppu;
    this.cartridge = cartridge;
    this.ppuRam = ppuRam;
    this.cpuRam = cpuRam;
    this.cpuBus = cpuBus;
    this.ppuBus = ppuBus;
    this.backgroundPalette = backgroundPalette;
    this.spritePalette = spritePalette;
    this.dma = dma;
    this.standardController1 = standardController1;
    this.standardController2 = standardController2;

    this.cpu.reset();
  }

  public frame(): void {
    const frame = (this.ppu as any).frame;
    while (true) {
      this.cpu.clock();
      this.ppu.clock();
      this.ppu.clock();
      this.ppu.clock();

      const newFrame = (this.ppu as any).frame;
      if (newFrame !== frame) {
        break;
      }
    }
  }

  public getImage(): Uint8Array {
    const pixels = this.ppu.pixels;

    const arr = new Uint8Array(256 * 240 * 3);
    let ptr = 0;
    for (const p of pixels) {
      const color = getColor(p);

      arr[ptr++] = color[0];
      arr[ptr++] = color[1];
      arr[ptr++] = color[2];
    }

    return arr;
  }
}
