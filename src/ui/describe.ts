import { GPU_LEN_MM, GPU_REAL_MM, kitGb, part } from '../core/data/hardware';
import { profileDef, softwareDef, toolDef } from '../core/data/content';
import type { Issue } from '../core/compat';
import type { Card, PartDef, PartInst, ProfileId, SoftwareInst, ToolId, BossId, PackKind } from '../core/types';
import { L, fmt, money, num } from '../i18n';
import { coolingSources } from '../core/build';
import { cardHeat, statsOf, swIds } from '../core/run';
import { IDLE_TEMP } from '../core/scoring';
import { game } from '../game/game';
import { h, img } from './dom';
import { plain } from '../i18n/rich';
import { rich, richLines } from './rich';

export function partName(id: string): string {
  return L().parts[id] ?? id;
}

export function cardName(c: Pick<Card, 'type' | 'level'>): string {
  return L().cardNames[c.type][c.level - 1] ?? '';
}

/** Plain text (toasts, labels); markers removed. */
export function issueText(i: Issue): string {
  const p: Record<string, string | number> = { ...i.params };
  return plain(L().compat[i.msg], p);
}

/** Rich variant for tooltips and sheets. */
export function issueNode(i: Issue): HTMLElement {
  return rich(L().compat[i.msg], { ...i.params });
}

/**
 * Stat lines of a part (localized, rich markers). One effect per line; plain specs (socket, slots, size) may share a line.
 * Render with `rich()` / `richLines()` from ./rich.
 */
export function partLines(d: PartDef, inst?: PartInst): string[] {
  const t = L();
  const f = t.fx;
  const out: string[] = [];
  const sign = (n: number) => (n > 0 ? '+' : n < 0 ? '−' : '±') + Math.abs(n);
  switch (d.cat) {
    case 'board':
      out.push(`${fmt(f.socket, { s: d.socket })} · ${fmt(f.chipset, { c: d.chipset })} · ${d.form}`);
      out.push(fmt(f.ramGen, { g: d.ramGen, n: d.dimms }));
      out.push(fmt(f.pcieSlots, { list: d.pcie.map((s) => (s.size === 16 ? (s.lanes < 16 ? `x16(x${s.lanes})` : 'x16') : 'x1')).join(' ') }));
      out.push(`${fmt(f.m2, { n: d.m2 })} · ${fmt(f.sata, { n: d.sata })} · ${fmt(f.lanes, { n: d.chipsetLanes })}`);
      break;
    case 'cpu':
      out.push(`${fmt(f.cores, { n: d.cores })} · ${fmt(f.socket, { s: d.socket })}`);
      out.push(fmt(f.lPerCard, { n: d.lPerCard, ty: 'cpu' }));
      out.push(fmt(f.clock, { n: d.takt }));
      out.push(fmt(f.heat, { n: d.heat }));
      out.push(fmt(f.lanes, { n: d.lanes }));
      if (d.igpu) out.push(fmt(f.igpu, { n: d.igpu }));
      out.push(d.ocable ? f.oc : f.noOc);
      if (d.special) out.push(t.special[d.special]);
      break;
    case 'gpu':
      out.push(fmt(f.lPerCard, { n: d.l, ty: 'gpu' }));
      if (d.t) out.push(fmt(f.tPerCard, { n: d.t, ty: 'gpu' }));
      out.push(fmt(f.heat, { n: d.heat }));
      out.push(fmt(f.length, { n: GPU_REAL_MM[d.id] ?? GPU_LEN_MM[d.len]! }) + ' · ' + fmt(f.width, { n: d.width }));
      out.push(fmt(f.lanes, { n: d.lanes }));
      if (d.dlss) out.push(f.dlss);
      if (d.special) out.push(t.special[d.special]);
      break;
    case 'ram':
      out.push(`${d.gen} · ${fmt(f.capacity, { n: d.gbPerStick })} = ${kitGb(d)} GB${d.xmp ? ' · ' + f.xmp : ''}${d.rgb ? ' · RGB' : ''}`);
      out.push(fmt(f.lPerCard, { n: d.l, ty: 'ram' }));
      if (d.t) out.push(fmt(f.tPerCard, { n: d.t, ty: 'ram' }));
      break;
    case 'drive':
      out.push(`${d.kind.toUpperCase().replace('NVME', 'NVMe Gen').replace('SATA', 'SATA SSD').replace('HDD', 'HDD')} · ${d.iface === 'sata' ? 'SATA' : 'M.2'}`);
      out.push(fmt(f.lPerCard, { n: d.l, ty: 'io' }));
      out.push(fmt(f.swSlots, { n: d.swSlots }));
      out.push(fmt(f.reroll, { n: sign(d.reroll) }));
      break;
    case 'psu':
      out.push(fmt(f.watt, { n: d.watt }) + (d.atx3 ? ' · ' + f.atx3 : ''));
      out.push(fmt(f.bill, { n: (d.billMod > 0 ? '+' : d.billMod < 0 ? '−' : '±') + money(Math.abs(d.billMod)) }));
      break;
    case 'cooler':
      out.push(fmt(f.cooling, { n: d.cooling }));
      out.push(d.radiator ? fmt(f.radiator, { n: d.radiator }) : fmt(f.height, { n: d.height }));
      if (d.special) out.push(t.special[d.special]);
      break;
    case 'fan':
      out.push(fmt(f.cooling, { n: d.cooling }));
      if (d.takt) out.push(t.special.rgbFan);
      break;
    case 'case':
      out.push(`${d.maxForm} · ${fmt(f.maxGpu, { n: GPU_LEN_MM[d.maxGpu]! })} · ${fmt(f.maxCooler, { n: d.maxCooler })}`);
      out.push(fmt(f.fanSlots, { n: d.fanSlots - d.builtinFans.length }) + (d.radiator ? ' · ' + fmt(f.radiator, { n: d.radiator }) : ''));
      out.push(fmt(f.airflow, { n: d.airflow }));
      if (d.builtinFans.length && d.builtinFans.some((x) => part(x).rgb)) out.push(fmt(t.special.builtinFans, { n: d.builtinFans.length }));
      if (d.special) out.push(t.special[d.special]);
      break;
    case 'exp':
      out.push(t.special[d.effect]);
      out.push(fmt(f.slotNeed, { n: d.minLanes }));
      break;
  }
  if (d.tdp) out.push(fmt(f.tdp, { n: d.tdp }));
  if (inst?.limitKnown) out.push(fmt(f.limit, { n: inst.limit }));
  if (inst?.broken) out.push(f.broken);
  return out;
}

export function partCard(id: string, inst?: PartInst, extra?: (HTMLElement | string)[]): HTMLElement {
  const d = part(id);
  const t = L();
  return h(
    'div',
    {},
    h('h4', {}, partName(id)),
    h('div', { class: 'dim', style: 'font-size:9.5px;margin-bottom:2px' }, `${t.cat[d.cat]} · ${fmt(t.fx.tier, { n: d.tier })}${d.price ? ' · ' + money(d.price) : ' · ' + t.special.starter}`),
    ...partLines(d, inst).map((l) => h('div', { class: 'fxline' }, rich(l))),
    ...(extra ?? []),
  );
}

export function softwareText(id: SoftwareInst['id'], counter = 0): string {
  const s = L().software[id];
  return fmt(s.desc, { n: counter });
}

export function softwareCard(id: SoftwareInst['id'], inst?: SoftwareInst): HTMLElement {
  const d = softwareDef(id);
  const t = L();
  return h(
    'div',
    {},
    h('h4', {}, t.software[id].name),
    h('div', { class: 'dim', style: 'font-size:9.5px' }, `${t.rarity[d.rarity]} · ${money(d.price)}`),
    richLines(softwareText(id, inst?.counter ?? (id === 'sw10' ? 2 : 0))),
  );
}

export function toolCard(id: ToolId): HTMLElement {
  const t = L();
  return h('div', {}, h('h4', {}, t.tools[id].name), h('div', { class: 'dim', style: 'font-size:9.5px' }, money(toolDef(id).price)), richLines(t.tools[id].desc));
}

export function profileName(id: ProfileId): string {
  return L().profiles[id].name;
}

export function driverCard(id: ProfileId, level: number): HTMLElement {
  const t = L();
  const p = profileDef(id);
  return h(
    'div',
    {},
    h('h4', {}, fmt(t.driver.name, { p: profileName(id), v: `${level + 1}.0` })),
    h('div', {}, fmt(t.driver.desc, { p: profileName(id), n: level + 1 })),
    h('div', { class: 'dim' }, `${t.profiles[id].desc}`),
    richLines(`${fmt(t.cardInfo.base, { n: p.incL })}\n${fmt(t.fx.clock, { n: p.incT })}`),
  );
}

/** Card tooltip: type + level + name, Perf, heat of the card (real `computeHeat` of the running build) and the enhancement. */
export function cardCard(c: Card): HTMLElement {
  const t = L();
  const run = game.run;
  const heat = run ? cardHeat(run, c) : null;
  return h(
    'div',
    {},
    h('h4', {}, img(`card_typeicon8_${c.type}`, 'i8'), ' ', `${t.cardTypes[c.type]} ${c.level} · ${cardName(c)}`),
    richLines(fmt(t.cardInfo.base, { n: c.level })),
    heat === null ? null : richLines(heat === 0 ? t.cardInfo.heatNone : fmt(t.cardInfo.heat, { n: Math.round(heat * 10) / 10 })),
    c.enh ? h('div', { class: 'c-gold', style: 'margin-top:2px' }, t.enh[c.enh].name) : null,
    c.enh ? richLines(t.enh[c.enh].desc) : null,
  );
}

export function bossCard(id: BossId): HTMLElement {
  const t = L();
  return h('div', {}, h('h4', {}, t.bosses[id].name), richLines(t.bosses[id].desc));
}

/** Thermometer / cooling tooltip: thresholds, cooling per play and its sources (one line each). */
export function heatTip(): HTMLElement {
  const t = L();
  const run = game.run;
  const rows: (HTMLElement | null)[] = [richLines(t.tips.heat)];
  if (run) {
    const opts = { software: swIds(run), pasteUses: run.pasteUses };
    const src = coolingSources(run.build, opts);
    const sum = src.reduce((n, x) => n + x.value, 0);
    const total = run.bench ? run.bench.cooling : statsOf(run).cooling;
    const name = (k: (typeof src)[number]) => (k.kind === 'sw5' ? t.software.sw5.name : k.kind === 'paste' ? '' : partName(k.id!));
    const lines = src.map((k) => fmt(t.tips.coolLine, { n: k.value, src: fmt(t.tips.coolSrc[k.kind], { name: name(k), n: run.pasteUses }) }));
    if (total < sum) lines.push(fmt(t.tips.coolMalus, { n: sum - total, src: t.tips.coolSrc.malus }));
    rows.push(
      h('div', { class: 'fxsep' }),
      richLines(fmt(t.tips.coolTitle, { n: total })),
      ...lines.map((l) => h('div', { class: 'fxline' }, rich(l))),
      h('div', { class: 'dim', style: 'margin-top:2px' }, fmt(t.tips.coolFloor, { n: IDLE_TEMP })),
    );
  }
  return h('div', {}, ...rows);
}

export function packCard(k: PackKind): HTMLElement {
  const t = L();
  return h('div', {}, h('h4', {}, t.packs[k].name), richLines(t.packs[k].desc));
}

export function iconLine(icon: string, text: string, cls = ''): HTMLElement {
  return h('span', { class: `chip ${cls}` }, img(icon, 'i8'), text);
}

export { num };
