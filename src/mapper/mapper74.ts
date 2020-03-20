import { IMapper } from '../api/mapper';
import { Mapper4 } from './mapper4';

// INES Mapper 074: https://wiki.nesdev.com/w/index.php/INES_Mapper_074
// The circuit board mounts an MMC3 clone together with a 74LS138 and 74LS139 to redirect 1 KiB CHR-ROM banks #8 and #9 to 2 KiB of CHR-RAM.
export class Mapper74 extends Mapper4 implements IMapper {
}
