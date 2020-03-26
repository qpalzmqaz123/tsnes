import { Describe, Test } from 'jest-decorator';
import * as path from 'path';
import * as fs from 'fs';
import { Emulator } from '../../..';

@Describe('PPU test')
export class PPUTest {
  @Test('Test palette_ram.nes')
  private test1() {
    const expectOutpt = '$01';

    const nesData = fs.readFileSync(path.resolve(__dirname, './palette_ram.nes'));
    const emulator: any = new Emulator(nesData);

    for (let i = 0; i < 20; i++) {
      emulator.frame();
    }

    const str = Array(expectOutpt.length).fill(0)
      .map((_, i) => String.fromCharCode(emulator.ppuBus.readByte(0x20A2 + i)))
      .join('');
    expect(str).toBe(expectOutpt);
  }

  @Test('Test power_up_palette.nes')
  private test2() {
    const expectOutpt = '$02';

    const nesData = fs.readFileSync(path.resolve(__dirname, './power_up_palette.nes'));
    const emulator: any = new Emulator(nesData);

    for (let i = 0; i < 20; i++) {
      emulator.frame();
    }

    const str = Array(expectOutpt.length).fill(0)
      .map((_, i) => String.fromCharCode(emulator.ppuBus.readByte(0x20A2 + i)))
      .join('');
    expect(str).toBe(expectOutpt);
  }

  @Test('Test sprite_ram.nes')
  private test3() {
    const expectOutpt = '$01';

    const nesData = fs.readFileSync(path.resolve(__dirname, './sprite_ram.nes'));
    const emulator: any = new Emulator(nesData);

    for (let i = 0; i < 20; i++) {
      emulator.frame();
    }

    const str = Array(expectOutpt.length).fill(0)
      .map((_, i) => String.fromCharCode(emulator.ppuBus.readByte(0x20A2 + i)))
      .join('');
    expect(str).toBe(expectOutpt);
  }

  @Test('Test vbl_clear_time.nes')
  private test4() {
    const expectOutpt = '$01';

    const nesData = fs.readFileSync(path.resolve(__dirname, './vbl_clear_time.nes'));
    const emulator: any = new Emulator(nesData);

    for (let i = 0; i < 50; i++) {
      emulator.frame();
    }

    const str = Array(expectOutpt.length).fill(0)
      .map((_, i) => String.fromCharCode(emulator.ppuBus.readByte(0x20A2 + i)))
      .join('');
    expect(str).toBe(expectOutpt);
  }

  @Test('Test vram_access.nes')
  private test5() {
    const expectOutpt = '$01';

    const nesData = fs.readFileSync(path.resolve(__dirname, './vram_access.nes'));
    const emulator: any = new Emulator(nesData);

    for (let i = 0; i < 20; i++) {
      emulator.frame();
    }

    const str = Array(expectOutpt.length).fill(0)
      .map((_, i) => String.fromCharCode(emulator.ppuBus.readByte(0x20A2 + i)))
      .join('');
    expect(str).toBe(expectOutpt);
  }
}
