import { Flags, ICPU } from '../api/cpu';
import { Registers } from './registers';
import { IBus } from '../api/bus';
import opcodeTable, { AddressingMode, Instruction } from './opcode-table';
import { uint16, uint8 } from '../api/types';

enum InterruptVector {
  NMI = 0xFFFA,
  RESET = 0xFFFC,
  IRQ = 0xFFFE,
}

interface AddressData {
  address: uint16; // Set value to NaN if immediate mode
  data: uint8; // Set value to NaN if not immediate mode
  isCrossPage: boolean;
}

// 6502 Instruction Reference: http://obelisk.me.uk/6502/reference.html
// 6502/6510/8500/8502 Opcode matrix: http://www.oxyron.de/html/opcodes02.html
export class CPU implements ICPU {
  public bus: IBus;

  private clocks = 0;
  private deferCycles = 0;
  private readonly registers = new Registers();
  private readonly instructionMap = new Map([
    [ Instruction.ADC, this.adc ],
    [ Instruction.AND, this.and ],
    [ Instruction.ASL, this.asl ],
    [ Instruction.BCC, this.bcc ],
    [ Instruction.BCS, this.bcs ],
    [ Instruction.BEQ, this.beq ],
    [ Instruction.BIT, this.bit ],
    [ Instruction.BMI, this.bmi ],
    [ Instruction.BNE, this.bne ],
    [ Instruction.BPL, this.bpl ],
    [ Instruction.BRK, this.brk ],
    [ Instruction.BVC, this.bvc ],
    [ Instruction.BVS, this.bvs ],
    [ Instruction.CLC, this.clc ],
    [ Instruction.CLD, this.cld ],
    [ Instruction.CLI, this.cli ],
    [ Instruction.CLV, this.clv ],
    [ Instruction.CMP, this.cmp ],
    [ Instruction.CPX, this.cpx ],
    [ Instruction.CPY, this.cpy ],
    [ Instruction.DEC, this.dec ],
    [ Instruction.DEX, this.dex ],
    [ Instruction.DEY, this.dey ],
    [ Instruction.EOR, this.eor ],
    [ Instruction.INC, this.inc ],
    [ Instruction.INX, this.inx ],
    [ Instruction.INY, this.iny ],
    [ Instruction.JMP, this.jmp ],
    [ Instruction.JSR, this.jsr ],
    [ Instruction.LDA, this.lda ],
    [ Instruction.LDX, this.ldx ],
    [ Instruction.LDY, this.ldy ],
    [ Instruction.LSR, this.lsr ],
    [ Instruction.NOP, this.nop ],
    [ Instruction.ORA, this.ora ],
    [ Instruction.PHA, this.pha ],
    [ Instruction.PHP, this.php ],
    [ Instruction.PLA, this.pla ],
    [ Instruction.PLP, this.plp ],
    [ Instruction.ROL, this.rol ],
    [ Instruction.ROR, this.ror ],
    [ Instruction.RTI, this.rti ],
    [ Instruction.RTS, this.rts ],
    [ Instruction.SBC, this.sbc ],
    [ Instruction.SEC, this.sec ],
    [ Instruction.SED, this.sed ],
    [ Instruction.SEI, this.sei ],
    [ Instruction.STA, this.sta ],
    [ Instruction.STX, this.stx ],
    [ Instruction.STY, this.sty ],
    [ Instruction.TAX, this.tax ],
    [ Instruction.TAY, this.tay ],
    [ Instruction.TSX, this.tsx ],
    [ Instruction.TXA, this.txa ],
    [ Instruction.TXS, this.txs ],
    [ Instruction.TYA, this.tya ],

    // Illegal instruction
    [ Instruction.DCP, this.dcp ],
    [ Instruction.ISC, this.isc ],
    [ Instruction.LAX, this.lax ],
    [ Instruction.RLA, this.rla ],
    [ Instruction.RRA, this.rra ],
    [ Instruction.SAX, this.sax ],
    [ Instruction.SLO, this.slo ],
    [ Instruction.SRE, this.sre ],
  ]);
  private readonly addressingModeMap = new Map([
    [ AddressingMode.ABSOLUTE, this.absolute ],
    [ AddressingMode.ABSOLUTE_X, this.absoluteX ],
    [ AddressingMode.ABSOLUTE_Y, this.absoluteY ],
    [ AddressingMode.ACCUMULATOR, this.accumulator ],
    [ AddressingMode.IMMEDIATE, this.immediate ],
    [ AddressingMode.IMPLICIT, this.implicit ],
    [ AddressingMode.INDIRECT, this.indirect ],
    [ AddressingMode.INDIRECT_Y_INDEXED, this.indirectYIndexed ],
    [ AddressingMode.RELATIVE, this.relative ],
    [ AddressingMode.X_INDEXED_INDIRECT, this.xIndexedIndirect ],
    [ AddressingMode.ZERO_PAGE, this.zeroPage ],
    [ AddressingMode.ZERO_PAGE_X, this.zeroPageX ],
    [ AddressingMode.ZERO_PAGE_Y, this.zeroPageY ],
  ]);

  public reset(): void {
    this.registers.A = 0;
    this.registers.X = 0;
    this.registers.Y = 0;
    this.registers.P = 0;
    this.registers.SP = 0xfd;
    this.registers.PC = this.bus.readWord(InterruptVector.RESET);

    this.deferCycles = 8;
    this.clocks = 0;
  }

  public clock(): void {
    if (this.deferCycles === 0) {
      this.step();
    }

    this.deferCycles--;
    this.clocks++;
  }

  public irq(): void {
    if (this.isFlagSet(Flags.I)) {
      return;
    }

    this.pushWord(this.registers.PC);
    this.pushByte((this.registers.P | Flags.U) & ~Flags.B);

    this.setFlag(Flags.I, true);

    this.registers.PC = this.bus.readWord(InterruptVector.IRQ);

    this.deferCycles += 7;
  }

  public nmi(): void {
    this.pushWord(this.registers.PC);
    this.pushByte((this.registers.P | Flags.U) & ~Flags.B);

    this.setFlag(Flags.I, true);

    this.registers.PC = this.bus.readWord(InterruptVector.NMI);

    this.deferCycles += 7;
  }

  private setFlag(flag: Flags, value: boolean): void {
    if (value) {
      this.registers.P |= flag;
    } else {
      this.registers.P &= ~flag;
    }
  }

  private isFlagSet(flag: Flags): boolean {
    return !!(this.registers.P & flag);
  }

  private step(): void {
    const opcode = this.bus.readByte(this.registers.PC++);
    const entry = opcodeTable[opcode];
    if (!entry) {
      throw new Error(`Invalid opcode '${opcode}(0x${opcode.toString(16)})', pc: 0x${(this.registers.PC - 1).toString(16)}`);
    }

    if (entry.instruction === Instruction.INVALID) {
      return;
    }

    // Illegal opcode
    if (entry.bytes === 0) {
      this.deferCycles += entry.cycles;
      return;
    }

    const addrModeFunc = this.addressingModeMap.get(entry.addressingMode);
    if (!addrModeFunc) {
      throw new Error(`Unsuppored addressing mode: ${AddressingMode[entry.addressingMode]}`);
    }

    const data = Uint8Array.from(
      Array(entry.bytes - 1)
        .fill(0)
        .map((v, i) => this.bus.readByte(this.registers.PC + i))
    );
    this.registers.PC += data.length;

    const ret: AddressData = addrModeFunc.call(this, data);
    if (ret.isCrossPage) {
      this.deferCycles += entry.pageCycles;
    }

    const instrFunc = this.instructionMap.get(entry.instruction);
    if (!instrFunc) {
      throw new Error(`Unsupported instruction: ${Instruction[entry.instruction]}`);
    }
    instrFunc.call(this, ret, entry.addressingMode);

    this.deferCycles += entry.cycles;
  }

  private pushWord(data: uint16): void {
    this.pushByte(data >> 8);
    this.pushByte(data);
  }

  private pushByte(data: uint8): void {
    this.bus.writeByte(0x100 + this.registers.SP, data);
    this.registers.SP--;
  }

  private popWord(): uint16 {
    return this.popByte() | this.popByte() << 8;
  }

  private popByte(): uint8 {
    this.registers.SP++;
    return this.bus.readByte(0x100 + this.registers.SP);
  }

  private setNZFlag(data: uint8) {
    this.setFlag(Flags.Z, (data & 0xFF) === 0);
    this.setFlag(Flags.N, !!(data & 0x80));
  }

  private getData(addrData: AddressData): uint8 {
    if (!isNaN(addrData.data)) {
      return addrData.data;
    } else {
      return this.bus.readByte(addrData.address);
    }
  }

  private absolute(data: Uint8Array): AddressData {
    const address = this.arr2Word(data);

    return {
      address: address & 0xFFFF,
      data: NaN,
      isCrossPage: false,
    };
  }

  private absoluteX(data: Uint8Array): AddressData {
    const baseAddress = this.arr2Word(data);

    const address = baseAddress + this.registers.X;

    return {
      address: address & 0xFFFF,
      data: NaN,
      isCrossPage: this.isCrossPage(baseAddress, address),
    };
  }

  private absoluteY(data: Uint8Array): AddressData {
    const baseAddress = this.arr2Word(data);
    const address = baseAddress + this.registers.Y;

    return {
      address: address & 0xFFFF,
      data: NaN,
      isCrossPage: this.isCrossPage(baseAddress, address),
    };
  }

  private accumulator(data: Uint8Array): AddressData {
    return {
      address: NaN,
      data: this.registers.A,
      isCrossPage: false,
    };
  }

  private immediate(data: Uint8Array): AddressData {
    return {
      address: NaN,
      data: data[0],
      isCrossPage: false,
    };
  }

  private implicit(data: Uint8Array): AddressData {
    return {
      address: NaN,
      data: NaN,
      isCrossPage: false,
    };
  }

  private indirect(data: Uint8Array): AddressData {
    let address = this.arr2Word(data);

    if ((address & 0xFF) === 0xFF) { // Hardware bug
      address = this.bus.readByte(address & 0xFF00) << 8 | this.bus.readByte(address);
    } else {
      address = this.bus.readWord(address);
    }

    return {
      address: address & 0xFFFF,
      data: NaN,
      isCrossPage: false,
    };
  }

  private indirectYIndexed(data: Uint8Array): AddressData {
    const value = data[0];

    const l = this.bus.readByte(value & 0xFF);
    const h = this.bus.readByte((value + 1) & 0xFF);

    const baseAddress = h << 8 | l;
    const address = baseAddress + this.registers.Y;

    return {
      address: address & 0xFFFF,
      data: NaN,
      isCrossPage: this.isCrossPage(baseAddress, address),
    };
  }

  private relative(data: Uint8Array): AddressData {
    // Range is -128 ~ 127
    let offset = data[0];
    if (offset & 0x80) {
      offset = offset - 0x100;
    }

    return {
      address: (this.registers.PC + offset) & 0xFFFF,
      data: NaN,
      isCrossPage: false,
    };
  }

  private xIndexedIndirect(data: Uint8Array): AddressData {
    const value = data[0];
    const address = (value + this.registers.X);

    const l = this.bus.readByte(address & 0xFF);
    const h = this.bus.readByte((address + 1) & 0xFF);

    return {
      address: (h << 8 | l) & 0xFFFF,
      data: NaN,
      isCrossPage: false,
    };
  }

  private zeroPage(data: Uint8Array): AddressData {
    const address = data[0];

    return {
      address: address & 0xFFFF,
      data: NaN,
      isCrossPage: false,
    };
  }

  private zeroPageX(data: Uint8Array): AddressData {
    const address = (data[0] + this.registers.X) & 0xFF;

    return {
      address: address & 0xFFFF,
      data: NaN,
      isCrossPage: false,
    };
  }

  private zeroPageY(data: Uint8Array): AddressData {
    const address = (data[0] + this.registers.Y) & 0xFF;

    return {
      address: address & 0xFFFF,
      data: NaN,
      isCrossPage: false,
    };
  }

  private adc(addrData: AddressData): void {
    const data = this.getData(addrData);
    const value = data + this.registers.A + (this.isFlagSet(Flags.C) ? 1 : 0);

    this.setFlag(Flags.C, value > 0xFF);
    this.setFlag(Flags.V, !!((~(this.registers.A ^ data) & (this.registers.A ^ value)) & 0x80));
    this.setNZFlag(value);

    this.registers.A = value & 0xFF;
  }

  private and(addrData: AddressData): void {
    this.registers.A &= this.getData(addrData);
    this.setNZFlag(this.registers.A);
  }

  private asl(addrData: AddressData): void {
    let data = this.getData(addrData) << 1;

    this.setFlag(Flags.C, !!(data & 0x100));
    data = data & 0xFF;
    this.setNZFlag(data);

    if (isNaN(addrData.address)) {
      this.registers.A = data;
    } else {
      this.bus.writeByte(addrData.address, data);
    }
  }

  private bcc(addrData: AddressData): void {
    if (!this.isFlagSet(Flags.C)) {
      this.deferCycles++;
      if (this.isCrossPage(this.registers.PC, addrData.address)) {
        this.deferCycles++;
      }

      this.registers.PC = addrData.address;
    }
  }

  private bcs(addrData: AddressData): void {
    if (this.isFlagSet(Flags.C)) {
      this.deferCycles++;
      if (this.isCrossPage(this.registers.PC, addrData.address)) {
        this.deferCycles++;
      }

      this.registers.PC = addrData.address;
    }
  }

  private beq(addrData: AddressData): void {
    if (this.isFlagSet(Flags.Z)) {
      this.deferCycles++;
      if (this.isCrossPage(this.registers.PC, addrData.address)) {
        this.deferCycles++;
      }

      this.registers.PC = addrData.address;
    }
  }

  private bit(addrData: AddressData): void {
    const data = this.getData(addrData);

    this.setFlag(Flags.Z, !(this.registers.A & data));
    this.setFlag(Flags.N, !!(data & (1 << 7)));
    this.setFlag(Flags.V, !!(data & (1 << 6)));
  }

  private bmi(addrData: AddressData): void {
    if (this.isFlagSet(Flags.N)) {
      this.deferCycles++;
      if (this.isCrossPage(this.registers.PC, addrData.address)) {
        this.deferCycles++;
      }

      this.registers.PC = addrData.address;
    }
  }

  private bne(addrData: AddressData): void {
    if (!this.isFlagSet(Flags.Z)) {
      this.deferCycles++;
      if (this.isCrossPage(this.registers.PC, addrData.address)) {
        this.deferCycles++;
      }

      this.registers.PC = addrData.address;
    }
  }

  private bpl(addrData: AddressData): void {
    if (!this.isFlagSet(Flags.N)) {
      this.deferCycles++;
      if (this.isCrossPage(this.registers.PC, addrData.address)) {
        this.deferCycles++;
      }

      this.registers.PC = addrData.address;
    }
  }

  private brk(addrData: AddressData): void {
    this.pushWord(this.registers.PC);
    this.pushByte(this.registers.P | Flags.B | Flags.U);

    this.setFlag(Flags.I, true);

    this.registers.PC = this.bus.readWord(InterruptVector.IRQ);
  }

  private bvc(addrData: AddressData): void {
    if (!this.isFlagSet(Flags.V)) {
      this.deferCycles++;
      if (this.isCrossPage(this.registers.PC, addrData.address)) {
        this.deferCycles++;
      }

      this.registers.PC = addrData.address;
    }
  }

  private bvs(addrData: AddressData): void {
    if (this.isFlagSet(Flags.V)) {
      this.deferCycles++;
      if (this.isCrossPage(this.registers.PC, addrData.address)) {
        this.deferCycles++;
      }

      this.registers.PC = addrData.address;
    }
  }

  private clc(addrData: AddressData): void {
    this.setFlag(Flags.C, false);
  }

  private cld(addrData: AddressData): void {
    this.setFlag(Flags.D, false);
  }

  private cli(addrData: AddressData): void {
    this.setFlag(Flags.I, false);
  }

  private clv(addrData: AddressData): void {
    this.setFlag(Flags.V, false);
  }

  private cmp(addrData: AddressData): void {
    const data = this.getData(addrData);
    const res = this.registers.A - data;

    this.setFlag(Flags.C, this.registers.A >= data);
    this.setNZFlag(res);
  }

  private cpx(addrData: AddressData): void {
    const data = this.getData(addrData);
    const res = this.registers.X - data;

    this.setFlag(Flags.C, this.registers.X >= data);
    this.setNZFlag(res);
  }

  private cpy(addrData: AddressData): void {
    const data = this.getData(addrData);
    const res = this.registers.Y - data;

    this.setFlag(Flags.C, this.registers.Y >= data);
    this.setNZFlag(res);
  }

  private dec(addrData: AddressData): void {
    const data = (this.getData(addrData) - 1) & 0xFF;

    this.bus.writeByte(addrData.address, data);
    this.setNZFlag(data);
  }

  private dex(addrData: AddressData): void {
    this.registers.X = (this.registers.X - 1) & 0xFF;
    this.setNZFlag(this.registers.X);
  }

  private dey(addrData: AddressData): void {
    this.registers.Y = (this.registers.Y - 1) & 0xFF;
    this.setNZFlag(this.registers.Y);
  }

  private eor(addrData: AddressData): void {
    this.registers.A ^= this.getData(addrData);
    this.setNZFlag(this.registers.A);
  }

  private inc(addrData: AddressData): void {
    const data = (this.getData(addrData) + 1) & 0xFF;

    this.bus.writeByte(addrData.address, data);
    this.setNZFlag(data);
  }

  private inx(addrData: AddressData): void {
    this.registers.X = (this.registers.X + 1) & 0xFF;
    this.setNZFlag(this.registers.X);
  }

  private iny(addrData: AddressData): void {
    this.registers.Y = (this.registers.Y + 1) & 0xFF;
    this.setNZFlag(this.registers.Y);
  }

  private jmp(addrData: AddressData): void {
    this.registers.PC = addrData.address;
  }

  private jsr(addrData: AddressData): void {
    this.pushWord(this.registers.PC - 1);
    this.registers.PC = addrData.address;
  }

  private lda(addrData: AddressData): void {
    this.registers.A = this.getData(addrData);

    this.setNZFlag(this.registers.A);
  }

  private ldx(addrData: AddressData): void {
    this.registers.X = this.getData(addrData);

    this.setNZFlag(this.registers.X);
  }

  private ldy(addrData: AddressData): void {
    this.registers.Y = this.getData(addrData);

    this.setNZFlag(this.registers.Y);
  }

  private lsr(addrData: AddressData): void {
    let data = this.getData(addrData);

    this.setFlag(Flags.C, !!(data & 0x01));
    data >>= 1;
    this.setNZFlag(data);

    if (isNaN(addrData.address)) {
      this.registers.A = data;
    } else {
      this.bus.writeByte(addrData.address, data);
    }
  }

  private nop(addrData: AddressData): void {
    // Do nothing
  }

  private ora(addrData: AddressData): void {
    this.registers.A |= this.getData(addrData);
    this.setNZFlag(this.registers.A);
  }

  private pha(addrData: AddressData): void {
    this.pushByte(this.registers.A);
  }

  private php(addrData: AddressData): void {
    this.pushByte(this.registers.P | Flags.B | Flags.U);
  }

  private pla(addrData: AddressData): void {
    this.registers.A = this.popByte();
    this.setNZFlag(this.registers.A);
  }

  private plp(addrData: AddressData): void {
    this.registers.P = this.popByte();
    this.setFlag(Flags.B, false);
    this.setFlag(Flags.U, false);
  }

  private rol(addrData: AddressData): void {
    let data = this.getData(addrData);

    const isCarry = this.isFlagSet(Flags.C);
    this.setFlag(Flags.C, !!(data & 0x80));
    data = (data << 1 | (isCarry ? 1 : 0)) & 0xFF;
    this.setNZFlag(data);

    if (isNaN(addrData.address)) {
      this.registers.A = data;
    } else {
      this.bus.writeByte(addrData.address, data);
    }
  }

  private ror(addrData: AddressData): void {
    let data = this.getData(addrData);

    const isCarry = this.isFlagSet(Flags.C);
    this.setFlag(Flags.C, !!(data & 1));
    data = data >> 1 | (isCarry ? 1 << 7 : 0);
    this.setNZFlag(data);

    if (isNaN(addrData.address)) {
      this.registers.A = data;
    } else {
      this.bus.writeByte(addrData.address, data);
    }
  }

  private rti(addrData: AddressData): void {
    this.registers.P = this.popByte();
    this.setFlag(Flags.B, false);
    this.setFlag(Flags.U, false);

    this.registers.PC = this.popWord();
  }

  private rts(addrData: AddressData): void {
    this.registers.PC = this.popWord() + 1;
  }

  private sbc(addrData: AddressData): void {
    const data = this.getData(addrData);
    const res = this.registers.A - data - (this.isFlagSet(Flags.C) ? 0 : 1);

    this.setNZFlag(res);
    this.setFlag(Flags.C, res >= 0);
    this.setFlag(Flags.V, !!((res ^ this.registers.A) & (res ^ data ^ 0xFF) & 0x0080));

    this.registers.A = res & 0xFF;
  }

  private sec(addrData: AddressData): void {
    this.setFlag(Flags.C, true);
  }

  private sed(addrData: AddressData): void {
    this.setFlag(Flags.D, true);
  }

  private sei(addrData: AddressData): void {
    this.setFlag(Flags.I, true);
  }

  private sta(addrData: AddressData): void {
    this.bus.writeByte(addrData.address, this.registers.A);
  }

  private stx(addrData: AddressData): void {
    this.bus.writeByte(addrData.address, this.registers.X);
  }

  private sty(addrData: AddressData): void {
    this.bus.writeByte(addrData.address, this.registers.Y);
  }

  private tax(addrData: AddressData): void {
    this.registers.X = this.registers.A;
    this.setNZFlag(this.registers.X);
  }

  private tay(addrData: AddressData): void {
    this.registers.Y = this.registers.A;
    this.setNZFlag(this.registers.Y);
  }

  private tsx(addrData: AddressData): void {
    this.registers.X = this.registers.SP;
    this.setNZFlag(this.registers.X);
  }

  private txa(addrData: AddressData): void {
    this.registers.A = this.registers.X;
    this.setNZFlag(this.registers.A);
  }

  private txs(addrData: AddressData): void {
    this.registers.SP = this.registers.X;
  }

  private tya(addrData: AddressData): void {
    this.registers.A = this.registers.Y;
    this.setNZFlag(this.registers.A);
  }

  // Illegal instruction
  private dcp(addrData: AddressData): void {
    this.dec(addrData);
    this.cmp(addrData);
  }

  private isc(addrData: AddressData): void {
    this.inc(addrData);
    this.sbc(addrData);
  }

  private lax(addrData: AddressData): void {
    this.lda(addrData);
    this.ldx(addrData);
  }

  private rla(addrData: AddressData): void {
    this.rol(addrData);
    this.and(addrData);
  }

  private rra(addrData: AddressData): void {
    this.ror(addrData);
    this.adc(addrData);
  }

  private sax(addrData: AddressData): void {
    const value = this.registers.A & this.registers.X;
    this.bus.writeByte(addrData.address, value);
  }

  private slo(addrData: AddressData): void {
    this.asl(addrData);
    this.ora(addrData);
  }

  private sre(addrData: AddressData): void {
    this.lsr(addrData);
    this.eor(addrData);
  }

  private isCrossPage(addr1: uint16, addr2: uint16): boolean {
    return (addr1 & 0xff00) !== (addr2 & 0xff00);
  }

  private arr2Word(arr: Uint8Array): uint16 {
    if (arr.length < 2) {
      throw new Error(`Invalid buffer ${arr}`);
    }

    return (arr[1] << 8 | arr[0]) & 0xFFFF;
  }
}
