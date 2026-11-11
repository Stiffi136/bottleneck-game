import { BaseScreen, placeEl } from './base';
import { button, h } from '../dom';
import { L } from '../../i18n';
import { goWorkbench } from '../../core/run';

export class ShopScreen extends BaseScreen {
  build(): void {
    this.g.setBg('shop');
    const b = button(L().shop.toWorkbench, () => {
      if (this.g.check(goWorkbench(this.g.run!))) {
        this.g.save();
        this.g.route();
      }
    }, { color: 'green', cls: 'big' });
    placeEl(b, { x: 20, y: this.vp.h - 60 });
    this.dom.append(h('div', {}, 'shop'), b);
  }
}
