import { BeforeAll, Describe, Test } from 'jest-decorator';
import { Flags } from '../../api/cpu';
import * as fs from 'fs';
import * as path from 'path';
import { Emulator } from '../..';

interface NesLogEntry {
  PC: number;
  A: number;
  X: number;
  Y: number;
  P: number;
  SP: number;
  CYC: number;
  PPU: number[];
}

@Describe('Test cpu instructions')
class TestInstructions {
  private log: NesLogEntry[];
  private emulator: any;

  @BeforeAll
  private setup() {
    this.log = require('./nestest-log.json');
    const nesData = fs.readFileSync(path.resolve(__dirname, './nestest.nes'));

    this.emulator = new Emulator(nesData);

    this.emulator.cpu.reset();
    this.emulator.cpu.registers.PC = 0xC000;
    this.emulator.cpu.deferCycles = 7;
    this.emulator.cpu.setFlag(Flags.I, true);
    this.emulator.ppu.scanLine = 0;
    this.emulator.ppu.cycle = -21;
  }

  @Test('Test all instruction')
  private test() {
    for (const log of this.log) {
      while (true) {
        if (this.emulator.cpu.deferCycles === 0) {
          const state = {
            PC: this.emulator.cpu.registers.PC.toString(16),
            A: this.emulator.cpu.registers.A.toString(16),
            X: this.emulator.cpu.registers.X.toString(16),
            Y: this.emulator.cpu.registers.Y.toString(16),
            P: this.emulator.cpu.registers.P.toString(16),
            SP: this.emulator.cpu.registers.SP.toString(16),
            CYC: this.emulator.cpu.clocks,
            PPU: [
              this.emulator.ppu.cycle,
              this.emulator.ppu.scanLine,
            ],
          };

          const cmp = {
            PC: log.PC.toString(16),
            A: log.A.toString(16),
            X: log.X.toString(16),
            Y: log.Y.toString(16),
            P: log.P.toString(16),
            SP: log.SP.toString(16),
            CYC: log.CYC,
            PPU: log.PPU,
          };

          expect(state).toMatchObject(cmp);

          this.clock();
          break;
        }

        this.clock();
      }
    }
  }

  private clock() {
    this.emulator.cpu.clock();
    this.emulator.ppu.clock();
    this.emulator.ppu.clock();
    this.emulator.ppu.clock();
  }
}
