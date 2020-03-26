export enum Instruction {
  ADC, AND, ASL, BCC, BCS, BEQ, BIT, BMI,
  BNE, BPL, BRK, BVC, BVS, CLC, CLD, CLI,
  CLV, CMP, CPX, CPY, DEC, DEX, DEY, EOR,
  INC, INX, INY, JMP, JSR, LDA, LDX, LDY,
  LSR, NOP, ORA, PHA, PHP, PLA, PLP, ROL,
  ROR, RTI, RTS, SBC, SEC, SED, SEI, STA,
  STX, STY, TAX, TAY, TSX, TXA, TXS, TYA,

  // Illegal opcode
  DCP, ISC, LAX, RLA, RRA, SAX, SLO, SRE,

  INVALID,
}

// Refer to http://obelisk.me.uk/6502/addressing.html#IMP
export enum AddressingMode {
  IMPLICIT, // CLC | RTS
  ACCUMULATOR, // LSR A
  IMMEDIATE, // LDA #10
  ZERO_PAGE, // LDA $00
  ZERO_PAGE_X, // STY $10, X
  ZERO_PAGE_Y, // LDX $10, Y
  RELATIVE, // BEQ label | BNE *+4
  ABSOLUTE, // JMP $1234
  ABSOLUTE_X, // STA $3000, X
  ABSOLUTE_Y, // AND $4000, Y
  INDIRECT, // JMP ($FFFC)
  X_INDEXED_INDIRECT, // LDA ($40, X)
  INDIRECT_Y_INDEXED, // LDA ($40), Y
}

export interface IOpcodeEntry {
  instruction: Instruction;
  addressingMode: AddressingMode;
  bytes: number;
  cycles: number;
  pageCycles: number;
}

const OPCODE_TABLE: IOpcodeEntry[] = [
  // http://nesdev.com/the%20%27B%27%20flag%20&%20BRK%20instruction.txt Says:
  //   Regardless of what ANY 6502 documentation says, BRK is a 2 byte opcode. The
  //   first is #$00, and the second is a padding byte. This explains why interrupt
  //   routines called by BRK always return 2 bytes after the actual BRK opcode,
  //   and not just 1.
  // So we use ZERO_PAGE instead of IMPLICIT addressing mode
  E(Instruction.BRK, AddressingMode.ZERO_PAGE, 2, 7, 0), // 0

  E(Instruction.ORA, AddressingMode.X_INDEXED_INDIRECT, 2, 6, 0), // 1, 1h
  undefined, // 2
  E(Instruction.SLO, AddressingMode.X_INDEXED_INDIRECT, 2, 8, 0), // 3, 3h
  E(Instruction.NOP, AddressingMode.ZERO_PAGE, 2, 3, 0), // 4, 4h
  E(Instruction.ORA, AddressingMode.ZERO_PAGE, 2, 3, 0), // 5, 5h
  E(Instruction.ASL, AddressingMode.ZERO_PAGE, 2, 5, 0), // 6, 6h
  E(Instruction.SLO, AddressingMode.ZERO_PAGE, 2, 5, 0), // 7, 7h
  E(Instruction.PHP, AddressingMode.IMPLICIT, 1, 3, 0), // 8, 8h
  E(Instruction.ORA, AddressingMode.IMMEDIATE, 2, 2, 0), // 9, 9h
  E(Instruction.ASL, AddressingMode.ACCUMULATOR, 1, 2, 0), // 10, Ah
  undefined, // 11
  E(Instruction.NOP, AddressingMode.ABSOLUTE, 3, 4, 0), // 12, Ch
  E(Instruction.ORA, AddressingMode.ABSOLUTE, 3, 4, 0), // 13, Dh
  E(Instruction.ASL, AddressingMode.ABSOLUTE, 3, 6, 0), // 14, Eh
  E(Instruction.SLO, AddressingMode.ABSOLUTE, 3, 6, 0), // 15, Fh
  E(Instruction.BPL, AddressingMode.RELATIVE, 2, 2, 1), // 16, 10h
  E(Instruction.ORA, AddressingMode.INDIRECT_Y_INDEXED, 2, 5, 1), // 17, 11h
  undefined, // 18
  E(Instruction.SLO, AddressingMode.INDIRECT_Y_INDEXED, 2, 8, 0), // 19, 13h
  E(Instruction.NOP, AddressingMode.ZERO_PAGE_X, 2, 4, 0), // 20, 14h
  E(Instruction.ORA, AddressingMode.ZERO_PAGE_X, 2, 4, 0), // 21, 15h
  E(Instruction.ASL, AddressingMode.ZERO_PAGE_X, 2, 6, 0), // 22, 16h
  E(Instruction.SLO, AddressingMode.ZERO_PAGE_X, 2, 6, 0), // 23, 17h
  E(Instruction.CLC, AddressingMode.IMPLICIT, 1, 2, 0), // 24, 18h
  E(Instruction.ORA, AddressingMode.ABSOLUTE_Y, 3, 4, 1), // 25, 19h
  E(Instruction.NOP, AddressingMode.IMPLICIT, 1, 2, 0), // 26, 1Ah
  E(Instruction.SLO, AddressingMode.ABSOLUTE_Y, 3, 7, 0), // 27, 1Bh
  E(Instruction.NOP, AddressingMode.ABSOLUTE_X, 3, 4, 1), // 28, 1Ch
  E(Instruction.ORA, AddressingMode.ABSOLUTE_X, 3, 4, 1), // 29, 1Dh
  E(Instruction.ASL, AddressingMode.ABSOLUTE_X, 3, 7, 0), // 30, 1Eh
  E(Instruction.SLO, AddressingMode.ABSOLUTE_X, 3, 7, 0), // 31, 1Fh
  E(Instruction.JSR, AddressingMode.ABSOLUTE, 3, 6, 0), // 32, 20h
  E(Instruction.AND, AddressingMode.X_INDEXED_INDIRECT, 2, 6, 0), // 33, 21h
  undefined, // 34
  E(Instruction.RLA, AddressingMode.X_INDEXED_INDIRECT, 2, 8, 0), // 35, 23h
  E(Instruction.BIT, AddressingMode.ZERO_PAGE, 2, 3, 0), // 36, 24h
  E(Instruction.AND, AddressingMode.ZERO_PAGE, 2, 3, 0), // 37, 25h
  E(Instruction.ROL, AddressingMode.ZERO_PAGE, 2, 5, 0), // 38, 26h
  E(Instruction.RLA, AddressingMode.ZERO_PAGE, 2, 5, 0), // 39, 27h
  E(Instruction.PLP, AddressingMode.IMPLICIT, 1, 4, 0), // 40, 28h
  E(Instruction.AND, AddressingMode.IMMEDIATE, 2, 2, 0), // 41, 29h
  E(Instruction.ROL, AddressingMode.ACCUMULATOR, 1, 2, 0), // 42, 2Ah
  undefined, // 43
  E(Instruction.BIT, AddressingMode.ABSOLUTE, 3, 4, 0), // 44, 2Ch
  E(Instruction.AND, AddressingMode.ABSOLUTE, 3, 4, 0), // 45, 2Dh
  E(Instruction.ROL, AddressingMode.ABSOLUTE, 3, 6, 0), // 46, 2Eh
  E(Instruction.RLA, AddressingMode.ABSOLUTE, 3, 6, 0), // 47, 2Fh
  E(Instruction.BMI, AddressingMode.RELATIVE, 2, 2, 1), // 48, 30h
  E(Instruction.AND, AddressingMode.INDIRECT_Y_INDEXED, 2, 5, 1), // 49, 31h
  undefined, // 50
  E(Instruction.RLA, AddressingMode.INDIRECT_Y_INDEXED, 2, 8, 0), // 51, 33h
  E(Instruction.NOP, AddressingMode.ZERO_PAGE_X, 2, 4, 0), // 52, 34h
  E(Instruction.AND, AddressingMode.ZERO_PAGE_X, 2, 4, 0), // 53, 35h
  E(Instruction.ROL, AddressingMode.ZERO_PAGE_X, 2, 6, 0), // 54, 36h
  E(Instruction.RLA, AddressingMode.ZERO_PAGE_X, 2, 6, 0), // 55, 37h
  E(Instruction.SEC, AddressingMode.IMPLICIT, 1, 2, 0), // 56, 38h
  E(Instruction.AND, AddressingMode.ABSOLUTE_Y, 3, 4, 1), // 57, 39h
  E(Instruction.NOP, AddressingMode.IMPLICIT, 1, 2, 0), // 58, 3Ah
  E(Instruction.RLA, AddressingMode.ABSOLUTE_Y, 3, 7, 0), // 59, 3Bh
  E(Instruction.NOP, AddressingMode.ABSOLUTE_X, 3, 4, 1), // 60, 3Ch
  E(Instruction.AND, AddressingMode.ABSOLUTE_X, 3, 4, 1), // 61, 3Dh
  E(Instruction.ROL, AddressingMode.ABSOLUTE_X, 3, 7, 0), // 62, 3Eh
  E(Instruction.RLA, AddressingMode.ABSOLUTE_X, 3, 7, 0), // 63, 3Fh
  E(Instruction.RTI, AddressingMode.IMPLICIT, 1, 6, 0), // 64, 40h
  E(Instruction.EOR, AddressingMode.X_INDEXED_INDIRECT, 2, 6, 0), // 65, 41h
  undefined, // 66
  E(Instruction.SRE, AddressingMode.X_INDEXED_INDIRECT, 2, 8, 0), // 67, 43h
  E(Instruction.NOP, AddressingMode.ZERO_PAGE, 2, 3, 0), // 68, 44h
  E(Instruction.EOR, AddressingMode.ZERO_PAGE, 2, 3, 0), // 69, 45h
  E(Instruction.LSR, AddressingMode.ZERO_PAGE, 2, 5, 0), // 70, 46h
  E(Instruction.SRE, AddressingMode.ZERO_PAGE, 2, 5, 0), // 71, 47h
  E(Instruction.PHA, AddressingMode.IMPLICIT, 1, 3, 0), // 72, 48H
  E(Instruction.EOR, AddressingMode.IMMEDIATE, 2, 2, 0), // 73, 49H
  E(Instruction.LSR, AddressingMode.ACCUMULATOR, 1, 2, 0), // 74, 4Ah
  undefined, // 75
  E(Instruction.JMP, AddressingMode.ABSOLUTE, 3, 3, 0), // 76, 4Ch
  E(Instruction.EOR, AddressingMode.ABSOLUTE, 3, 4, 0), // 77, 4Dh
  E(Instruction.LSR, AddressingMode.ABSOLUTE, 3, 6, 0), // 78, 4Eh
  E(Instruction.SRE, AddressingMode.ABSOLUTE, 3, 6, 0), // 79, 4Fh
  E(Instruction.BVC, AddressingMode.RELATIVE, 2, 2, 1), // 80, 50h
  E(Instruction.EOR, AddressingMode.INDIRECT_Y_INDEXED, 2, 5, 1), // 81, 51h
  undefined, // 82
  E(Instruction.SRE, AddressingMode.INDIRECT_Y_INDEXED, 2, 8, 0), // 83, 53h
  E(Instruction.NOP, AddressingMode.ZERO_PAGE_X, 2, 4, 0), // 84, 54h
  E(Instruction.EOR, AddressingMode.ZERO_PAGE_X, 2, 4, 0), // 85, 55h
  E(Instruction.LSR, AddressingMode.ZERO_PAGE_X, 2, 6, 0), // 86, 56h
  E(Instruction.SRE, AddressingMode.ZERO_PAGE_X, 2, 6, 0), // 87, 57h
  E(Instruction.CLI, AddressingMode.IMPLICIT, 1, 2, 0), // 88, 58h
  E(Instruction.EOR, AddressingMode.ABSOLUTE_Y, 3, 4, 1), // 89, 59h
  E(Instruction.NOP, AddressingMode.IMPLICIT, 1, 2, 0), // 90, 5Ah
  E(Instruction.SRE, AddressingMode.ABSOLUTE_Y, 3, 7, 0), // 91, 5Bh
  E(Instruction.NOP, AddressingMode.ABSOLUTE_X, 3, 4, 1), // 92, 5Ch
  E(Instruction.EOR, AddressingMode.ABSOLUTE_X, 3, 4, 1), // 93, 5Dh
  E(Instruction.LSR, AddressingMode.ABSOLUTE_X, 3, 7, 0), // 94, 5Eh
  E(Instruction.SRE, AddressingMode.ABSOLUTE_X, 3, 7, 0), // 95, 5Fh
  E(Instruction.RTS, AddressingMode.IMPLICIT, 1, 6, 0), // 96, 60h
  E(Instruction.ADC, AddressingMode.X_INDEXED_INDIRECT, 2, 6, 0), // 97, 61h
  undefined, // 98
  E(Instruction.RRA, AddressingMode.X_INDEXED_INDIRECT, 2, 8, 0), // 99, 63h
  E(Instruction.NOP, AddressingMode.ZERO_PAGE, 2, 3, 0), // 100, 64h
  E(Instruction.ADC, AddressingMode.ZERO_PAGE, 2, 3, 0), // 101, 65h
  E(Instruction.ROR, AddressingMode.ZERO_PAGE, 2, 5, 0), // 102, 66h
  E(Instruction.RRA, AddressingMode.ZERO_PAGE, 2, 5, 0), // 103, 67h
  E(Instruction.PLA, AddressingMode.IMPLICIT, 1, 4, 0), // 104, 68h
  E(Instruction.ADC, AddressingMode.IMMEDIATE, 2, 2, 0), // 105, 69h
  E(Instruction.ROR, AddressingMode.ACCUMULATOR, 1, 2, 0), // 106, 6Ah
  undefined, // 107
  E(Instruction.JMP, AddressingMode.INDIRECT, 3, 5, 0), // 108, 6Ch
  E(Instruction.ADC, AddressingMode.ABSOLUTE, 3, 4, 0), // 109, 6Dh
  E(Instruction.ROR, AddressingMode.ABSOLUTE, 3, 6, 0), // 110, 6Eh
  E(Instruction.RRA, AddressingMode.ABSOLUTE, 3, 6, 0), // 111, 6Fh
  E(Instruction.BVS, AddressingMode.RELATIVE, 2, 2, 1), // 112, 70h
  E(Instruction.ADC, AddressingMode.INDIRECT_Y_INDEXED, 2, 5, 1), // 113, 71h
  undefined, // 114
  E(Instruction.RRA, AddressingMode.INDIRECT_Y_INDEXED, 2, 8, 0), // 115, 73h
  E(Instruction.NOP, AddressingMode.ZERO_PAGE_X, 2, 4, 0), // 116, 74h
  E(Instruction.ADC, AddressingMode.ZERO_PAGE_X, 2, 4, 0), // 117, 75h
  E(Instruction.ROR, AddressingMode.ZERO_PAGE_X, 2, 6, 0), // 118, 76h
  E(Instruction.RRA, AddressingMode.ZERO_PAGE_X, 2, 6, 0), // 119, 77h
  E(Instruction.SEI, AddressingMode.IMPLICIT, 1, 2, 0), // 120, 78h
  E(Instruction.ADC, AddressingMode.ABSOLUTE_Y, 3, 4, 1), // 121, 79h
  E(Instruction.NOP, AddressingMode.IMPLICIT, 1, 2, 0), // 122, 7Ah
  E(Instruction.RRA, AddressingMode.ABSOLUTE_Y, 3, 7, 0), // 123, 7Bh
  E(Instruction.NOP, AddressingMode.ABSOLUTE_X, 3, 4, 1), // 124, 7Ch
  E(Instruction.ADC, AddressingMode.ABSOLUTE_X, 3, 4, 1), // 125, 7Dh
  E(Instruction.ROR, AddressingMode.ABSOLUTE_X, 3, 7, 0), // 126, 7Eh
  E(Instruction.RRA, AddressingMode.ABSOLUTE_X, 3, 7, 0), // 127, 7Fh
  E(Instruction.NOP, AddressingMode.IMMEDIATE, 2, 2, 0), // 128, 80h
  E(Instruction.STA, AddressingMode.X_INDEXED_INDIRECT, 2, 6, 0), // 129, 81h
  E(Instruction.NOP, AddressingMode.IMMEDIATE, 2, 2, 0), // 130, 82h
  E(Instruction.SAX, AddressingMode.X_INDEXED_INDIRECT, 2, 6, 0), // 131, 83h
  E(Instruction.STY, AddressingMode.ZERO_PAGE, 2, 3, 0), // 132, 84h
  E(Instruction.STA, AddressingMode.ZERO_PAGE, 2, 3, 0), // 133, 85h
  E(Instruction.STX, AddressingMode.ZERO_PAGE, 2, 3, 0), // 134, 86h
  E(Instruction.SAX, AddressingMode.ZERO_PAGE, 2, 3, 0), // 135, 87h
  E(Instruction.DEY, AddressingMode.IMPLICIT, 1, 2, 0), // 136, 88h
  undefined, // 137
  E(Instruction.TXA, AddressingMode.IMPLICIT, 1, 2, 0), // 138, 8Ah
  undefined, // 139
  E(Instruction.STY, AddressingMode.ABSOLUTE, 3, 4, 0), // 140, 8Ch
  E(Instruction.STA, AddressingMode.ABSOLUTE, 3, 4, 0), // 141, 8Dh
  E(Instruction.STX, AddressingMode.ABSOLUTE, 3, 4, 0), // 142, 8Eh
  E(Instruction.SAX, AddressingMode.ABSOLUTE, 3, 4, 0), // 143, 8Fh
  E(Instruction.BCC, AddressingMode.RELATIVE, 2, 2, 1), // 144, 90h
  E(Instruction.STA, AddressingMode.INDIRECT_Y_INDEXED, 2, 6, 0), // 145, 91h
  undefined, // 146
  undefined, // 147
  E(Instruction.STY, AddressingMode.ZERO_PAGE_X, 2, 4, 0), // 148, 94h
  E(Instruction.STA, AddressingMode.ZERO_PAGE_X, 2, 4, 0), // 149, 95h
  E(Instruction.STX, AddressingMode.ZERO_PAGE_Y, 2, 4, 0), // 150, 96h
  E(Instruction.SAX, AddressingMode.ZERO_PAGE_Y, 2, 4, 0), // 151, 97h
  E(Instruction.TYA, AddressingMode.IMPLICIT, 1, 2, 0), // 152, 98h
  E(Instruction.STA, AddressingMode.ABSOLUTE_Y, 3, 5, 0), // 153, 99h
  E(Instruction.TXS, AddressingMode.IMPLICIT, 1, 2, 0), // 154, 9Ah
  undefined, // 155
  undefined, // 156
  E(Instruction.STA, AddressingMode.ABSOLUTE_X, 3, 5, 0), // 157, 9Dh
  undefined, // 158
  undefined, // 159
  E(Instruction.LDY, AddressingMode.IMMEDIATE, 2, 2, 0), // 160, A0h
  E(Instruction.LDA, AddressingMode.X_INDEXED_INDIRECT, 2, 6, 0), // 161, A1h
  E(Instruction.LDX, AddressingMode.IMMEDIATE, 2, 2, 0), // 162, A2h
  E(Instruction.LAX, AddressingMode.X_INDEXED_INDIRECT, 2, 6, 0), // 163, A3h
  E(Instruction.LDY, AddressingMode.ZERO_PAGE, 2, 3, 0), // 164, A4h
  E(Instruction.LDA, AddressingMode.ZERO_PAGE, 2, 3, 0), // 165, A5h
  E(Instruction.LDX, AddressingMode.ZERO_PAGE, 2, 3, 0), // 166, A6h
  E(Instruction.LAX, AddressingMode.ZERO_PAGE, 2, 3, 0), // 167, A7h
  E(Instruction.TAY, AddressingMode.IMPLICIT, 1, 2, 0), // 168, A8h
  E(Instruction.LDA, AddressingMode.IMMEDIATE, 2, 2, 0), // 169, A9h
  E(Instruction.TAX, AddressingMode.IMPLICIT, 1, 2, 0), // 170, AAh
  undefined, // 171
  E(Instruction.LDY, AddressingMode.ABSOLUTE, 3, 4, 0), // 172, ACh
  E(Instruction.LDA, AddressingMode.ABSOLUTE, 3, 4, 0), // 173, ADh
  E(Instruction.LDX, AddressingMode.ABSOLUTE, 3, 4, 0), // 174, AEh
  E(Instruction.LAX, AddressingMode.ABSOLUTE, 3, 4, 0), // 175, AFh
  E(Instruction.BCS, AddressingMode.RELATIVE, 2, 2, 1), // 176, B0h
  E(Instruction.LDA, AddressingMode.INDIRECT_Y_INDEXED, 2, 5, 1), // 177, B1h
  undefined, // 178
  E(Instruction.LAX, AddressingMode.INDIRECT_Y_INDEXED, 2, 5, 1), // 179, B3h
  E(Instruction.LDY, AddressingMode.ZERO_PAGE_X, 2, 4, 0), // 180, B4h
  E(Instruction.LDA, AddressingMode.ZERO_PAGE_X, 2, 4, 0), // 181, B5h
  E(Instruction.LDX, AddressingMode.ZERO_PAGE_Y, 2, 4, 0), // 182, B6h
  E(Instruction.LAX, AddressingMode.ZERO_PAGE_Y, 2, 4, 0), // 183, B7h
  E(Instruction.CLV, AddressingMode.IMPLICIT, 1, 2, 0), // 184, B8h
  E(Instruction.LDA, AddressingMode.ABSOLUTE_Y, 3, 4, 1), // 185, B9h
  E(Instruction.TSX, AddressingMode.IMPLICIT, 1, 2, 0), // 186, BAh
  undefined, // 187
  E(Instruction.LDY, AddressingMode.ABSOLUTE_X, 3, 4, 1), // 188, BCh
  E(Instruction.LDA, AddressingMode.ABSOLUTE_X, 3, 4, 1), // 189, BDh
  E(Instruction.LDX, AddressingMode.ABSOLUTE_Y, 3, 4, 1), // 190, BEh
  E(Instruction.LAX, AddressingMode.ABSOLUTE_Y, 3, 4, 1), // 191, BFh
  E(Instruction.CPY, AddressingMode.IMMEDIATE, 2, 2, 0), // 192, C0h
  E(Instruction.CMP, AddressingMode.X_INDEXED_INDIRECT, 2, 6, 0), // 193, C1h
  undefined, // 194
  E(Instruction.DCP, AddressingMode.X_INDEXED_INDIRECT, 2, 8, 0), // 195, C3h
  E(Instruction.CPY, AddressingMode.ZERO_PAGE, 2, 3, 0), // 196, C4h
  E(Instruction.CMP, AddressingMode.ZERO_PAGE, 2, 3, 0), // 197, C5h
  E(Instruction.DEC, AddressingMode.ZERO_PAGE, 2, 5, 0), // 198, C6h
  E(Instruction.DCP, AddressingMode.ZERO_PAGE, 2, 5, 0), // 199, C7h
  E(Instruction.INY, AddressingMode.IMPLICIT, 1, 2, 0), // 200, C8h
  E(Instruction.CMP, AddressingMode.IMMEDIATE, 2, 2, 0), // 201, C9h
  E(Instruction.DEX, AddressingMode.IMPLICIT, 1, 2, 0), // 202, CAh
  undefined, // 203
  E(Instruction.CPY, AddressingMode.ABSOLUTE, 3, 4, 0), // 204, CCh
  E(Instruction.CMP, AddressingMode.ABSOLUTE, 3, 4, 0), // 205, CDh
  E(Instruction.DEC, AddressingMode.ABSOLUTE, 3, 6, 0), // 206, CEh
  E(Instruction.DCP, AddressingMode.ABSOLUTE, 3, 6, 0), // 207, CFh
  E(Instruction.BNE, AddressingMode.RELATIVE, 2, 2, 1), // 208, D0h
  E(Instruction.CMP, AddressingMode.INDIRECT_Y_INDEXED, 2, 5, 1), // 209, D1h
  undefined, // 210
  E(Instruction.DCP, AddressingMode.INDIRECT_Y_INDEXED, 2, 8, 0), // 211, D3h
  E(Instruction.NOP, AddressingMode.ZERO_PAGE_X, 2, 4, 0), // 212, D4h
  E(Instruction.CMP, AddressingMode.ZERO_PAGE_X, 2, 4, 0), // 213, D5h
  E(Instruction.DEC, AddressingMode.ZERO_PAGE_X, 2, 6, 0), // 214, D6h
  E(Instruction.DCP, AddressingMode.ZERO_PAGE_X, 2, 6, 0), // 215, D7h
  E(Instruction.CLD, AddressingMode.IMPLICIT, 1, 2, 0), // 216, D8h
  E(Instruction.CMP, AddressingMode.ABSOLUTE_Y, 3, 4, 1), // 217, D9h
  E(Instruction.NOP, AddressingMode.IMPLICIT, 1, 2, 0), // 218, DAh
  E(Instruction.DCP, AddressingMode.ABSOLUTE_Y, 3, 7, 0), // 219, DBh
  E(Instruction.NOP, AddressingMode.ABSOLUTE_X, 3, 4, 1), // 220, DCh
  E(Instruction.CMP, AddressingMode.ABSOLUTE_X, 3, 4, 1), // 221, DDh
  E(Instruction.DEC, AddressingMode.ABSOLUTE_X, 3, 7, 0), // 222, DEh
  E(Instruction.DCP, AddressingMode.ABSOLUTE_X, 3, 7, 0), // 223, DFh
  E(Instruction.CPX, AddressingMode.IMMEDIATE, 2, 2, 0), // 224, E0h
  E(Instruction.SBC, AddressingMode.X_INDEXED_INDIRECT, 2, 6, 0), // 225, E1h
  undefined, // 226
  E(Instruction.ISC, AddressingMode.X_INDEXED_INDIRECT, 2, 8, 0), // 227, E3h
  E(Instruction.CPX, AddressingMode.ZERO_PAGE, 2, 3, 0), // 228, E4h
  E(Instruction.SBC, AddressingMode.ZERO_PAGE, 2, 3, 0), // 229, E5h
  E(Instruction.INC, AddressingMode.ZERO_PAGE, 2, 5, 0), // 230, E6h
  E(Instruction.ISC, AddressingMode.ZERO_PAGE, 2, 5, 0), // 231, E7h
  E(Instruction.INX, AddressingMode.IMPLICIT, 1, 2, 0), // 232, E8h
  E(Instruction.SBC, AddressingMode.IMMEDIATE, 2, 2, 0), // 233, E9h
  E(Instruction.NOP, AddressingMode.IMPLICIT, 1, 2, 0), // 234, EAh
  E(Instruction.SBC, AddressingMode.IMMEDIATE, 2, 2, 0), // 235, EBh
  E(Instruction.CPX, AddressingMode.ABSOLUTE, 3, 4, 0), // 236, ECh
  E(Instruction.SBC, AddressingMode.ABSOLUTE, 3, 4, 0), // 237, EDh
  E(Instruction.INC, AddressingMode.ABSOLUTE, 3, 6, 0), // 238, EEh
  E(Instruction.ISC, AddressingMode.ABSOLUTE, 3, 6, 0), // 239, EFh
  E(Instruction.BEQ, AddressingMode.RELATIVE, 2, 2, 1), // 240, F0h
  E(Instruction.SBC, AddressingMode.INDIRECT_Y_INDEXED, 2, 5, 1), // 241, F1h
  undefined, // 242
  E(Instruction.ISC, AddressingMode.INDIRECT_Y_INDEXED, 2, 8, 0), // 243, F3h
  E(Instruction.NOP, AddressingMode.ZERO_PAGE_X, 2, 4, 0), // 244, F4h
  E(Instruction.SBC, AddressingMode.ZERO_PAGE_X, 2, 4, 0), // 245, F5h
  E(Instruction.INC, AddressingMode.ZERO_PAGE_X, 2, 6, 0), // 246, F6h
  E(Instruction.ISC, AddressingMode.ZERO_PAGE_X, 2, 6, 0), // 247, F7h
  E(Instruction.SED, AddressingMode.IMPLICIT, 1, 2, 0), // 248, F8h
  E(Instruction.SBC, AddressingMode.ABSOLUTE_Y, 3, 4, 1), // 249, F9h
  E(Instruction.NOP, AddressingMode.IMPLICIT, 1, 2, 0), // 250, FAh
  E(Instruction.ISC, AddressingMode.ABSOLUTE_Y, 3, 7, 0), // 251, FBh
  E(Instruction.NOP, AddressingMode.ABSOLUTE_X, 3, 4, 1), // 252, FCh
  E(Instruction.SBC, AddressingMode.ABSOLUTE_X, 3, 4, 1), // 253, FDh
  E(Instruction.INC, AddressingMode.ABSOLUTE_X, 3, 7, 0), // 254, FEh
  E(Instruction.ISC, AddressingMode.ABSOLUTE_X, 3, 7, 0), // 255, FFh
];

export default OPCODE_TABLE;

function E(instruction: Instruction, addressingMode: AddressingMode, bytes: number, cycles: number, pageCycles: number): IOpcodeEntry {
  return {
    instruction,
    addressingMode,
    bytes,
    cycles,
    pageCycles,
  };
}
