import { BaseScreen, placeEl } from './base';
import { button } from '../dom';
import { L } from '../../i18n';
import { leaveWorkbench } from '../../core/run';

export class WorkbenchScreen extends BaseScreen {
  build(): void {
    this.g.setBg('esd');
    const b = button(L().wb.postRun, () => {
      if (this.g.check(leaveWorkbench(this.g.run!))) {
        this.g.save();
        this.g.route();
      }
    }, { color: 'green', cls: 'big' });
    placeEl(b, { x: 20, y: this.vp.h - 60 });
    this.dom.append(b);
  }
}
