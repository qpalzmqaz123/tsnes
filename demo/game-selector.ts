import axios from 'axios';
import * as path from 'path';

const GAMES = new Map([
  ['Super Mario 1', 'rom/超级马里奥1.nes'],
  ['Super Mario 2', 'rom/超级马里奥2.nes'],
  ['Super Mario 3', 'rom/超级马里奥3.nes'],
  ['1942', 'rom/1942 (JU).nes'],
  ['The Goonies 2', 'rom/七宝奇谋.nes'],
  ['Silkworm', 'rom/中东战争.nes'],
  ['Adventure Island 3', 'rom/冒险岛3.nes'],
  ['Adventure Island 4', 'rom/冒险岛4.nes'],
  ['Battle City', 'rom/坦克大战.nes'],
  ['Donkey Kong 1', 'rom/大金刚.nes'],
  ['天使之翼 2', 'rom/天使之翼2.nes'],
  ['Ninja Gaiden 2', 'rom/忍者龙剑传2_无敌版.nes'],
  ['Final Fantasy', 'rom/最终幻想US.nes'],
  ['Final Fantasy 2', 'rom/最终幻想2US.nes'],
  ['Chip Dale 2', 'rom/松鼠大战2无敌版.nes'],
  ['Rockman', 'rom/洛克人US.nes'],
  ['Road Fighter', 'rom/火箭车.nes'],
  ['Jackal', 'rom/赤色要塞.nes'],
  ['重装机兵', 'rom/重装机兵CN.nes'],
  ['Snow Bros', 'rom/雪人兄弟_无敌版.nes'],
  ['Contra', 'rom/魂斗罗S枪30条命版.nes'],
  ['Contra 2', 'rom/魂斗罗2.nes'],
]);

export class GameSelector {
  public onChange: (filename: string, data: Uint8Array) => void = () => undefined;

  constructor(
    private readonly element: HTMLSelectElement,
    private readonly progressElement = document.createElement('p'),
  ) {
    element.after(this.progressElement);

    this.element.innerHTML = Array.from(GAMES.entries()).map(([k, v]) => {
      return `<option value="${v}">${k}</option>`;
    }).join('');

    this.element.value = '';

    this.element.addEventListener('change', e => {
      this.fetchGameData(this.element.value);
    });
  }

  private fetchGameData(url: string) {
    axios.get(url, {
      responseType: 'arraybuffer',
      onDownloadProgress: e => {
        this.progressElement.innerText = `${Math.floor(e.loaded * 100 / e.total)}%`;
      },
    })
    .then(resp => {
      this.element.disabled = true;
      this.onChange(path.basename(url), new Uint8Array(resp.data));
    })
    .catch(e => {
      alert(e.message);
    });
  }
}
