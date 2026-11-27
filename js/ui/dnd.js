// Touch-friendly drag & drop built on Pointer Events (works with finger, mouse and pen).
import { h, icon } from '../core/dom.js';

/** Sortable vertical list. items: [{id, node}] ; returns {el, order():ids, lock()} */
export function sortable(items, { onChange } = {}) {
  const list = h('div.dlist', { role: 'list' });
  let locked = false;
  const makeRow = it => {
    const up = h('button', { type: 'button', 'aria-label': 'Выше' }, icon('up'));
    const down = h('button', { type: 'button', 'aria-label': 'Ниже' }, icon('down'));
    const row = h('div.ditem', { role: 'listitem', dataset: { id: it.id } },
      h('span.ditem__handle', icon('drag')), h('span.ditem__text', it.node), h('span.ditem__moves', up, down));
    up.addEventListener('click', e => { e.stopPropagation(); if (locked) return; const p = row.previousElementSibling; if (p) { list.insertBefore(row, p); changed(); up.focus(); } });
    down.addEventListener('click', e => { e.stopPropagation(); if (locked) return; const n = row.nextElementSibling; if (n) { list.insertBefore(n, row); changed(); down.focus(); } });
    row.addEventListener('pointerdown', e => startDrag(e, row));
    return row;
  };
  const changed = () => { if (onChange) onChange(order()); };
  items.forEach(it => list.append(makeRow(it)));

  function startDrag(e, row) {
    if (locked || e.button > 0 || e.target.closest('.ditem__moves')) return;
    e.preventDefault();
    const r0 = row.getBoundingClientRect();
    const grab = e.clientY - r0.top; // finger offset inside the row
    row.classList.add('is-dragging');
    try { row.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    const naturalTop = () => { const t = row.style.transform; row.style.transform = ''; const top = row.getBoundingClientRect().top; row.style.transform = t; return top; };
    let base = naturalTop();
    const move = ev => {
      const visualTop = ev.clientY - grab;
      const center = visualTop + r0.height / 2;
      let target = null;
      for (const s of list.children) {
        if (s === row) continue;
        const r = s.getBoundingClientRect();
        if (center < r.top + r.height / 2) { target = s; break; }
      }
      if (target !== row.nextElementSibling) {
        if (target) list.insertBefore(row, target); else list.append(row);
        base = naturalTop();
      }
      row.style.transform = `translateY(${visualTop - base}px)`;
    };
    const up = () => {
      row.classList.remove('is-dragging');
      row.style.transform = '';
      row.removeEventListener('pointermove', move);
      row.removeEventListener('pointerup', up);
      row.removeEventListener('pointercancel', up);
      changed();
    };
    row.addEventListener('pointermove', move);
    row.addEventListener('pointerup', up);
    row.addEventListener('pointercancel', up);
  }

  const order = () => [...list.children].map(x => x.dataset.id);
  return { el: list, order, lock: () => { locked = true; list.querySelectorAll('button').forEach(b => { b.disabled = true; }); }, rows: () => [...list.children] };
}

/**
 * Drag chips from a pool into buckets (also tap chip -> tap bucket).
 * items: [{id, node}], buckets: [{id, title}] ; returns {el, placement(): {itemId: bucketId|null}, lock()}
 */
export function bucketSorter(items, buckets, { onChange } = {}) {
  const pool = h('div.pool', { 'aria-label': 'Нераспределённые' });
  const bEls = buckets.map(b => h('div.bucket', { dataset: { b: b.id }, role: 'button', tabindex: '0', 'aria-label': `Группа: ${b.title}` }, h('div.bucket__title', b.title)));
  let selected = null;
  let locked = false;
  const chips = items.map(it => {
    const c = h('div.ditem', { dataset: { id: it.id }, tabindex: '0', role: 'button' }, h('span.ditem__text', it.node));
    c.addEventListener('pointerdown', e => drag(e, c));
    c.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(c); } });
    pool.append(c);
    return c;
  });
  const select = c => {
    if (locked) return;
    if (selected) selected.classList.remove('selected-item');
    selected = selected === c ? null : c;
    if (selected) selected.classList.add('selected-item');
  };
  const place = (c, target) => {
    target.append(c);
    c.classList.remove('selected-item');
    selected = null;
    if (onChange) onChange();
  };
  bEls.forEach(b => {
    const act = () => { if (selected && !locked) place(selected, b); };
    b.addEventListener('click', e => { if (e.target === b || e.target.classList.contains('bucket__title')) act(); });
    b.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(); } });
  });
  pool.addEventListener('click', e => { if (e.target === pool && selected && !locked) place(selected, pool); });

  function drag(e, c) {
    if (locked || e.button > 0) return;
    e.preventDefault();
    const r = c.getBoundingClientRect();
    const sx = e.clientX, sy = e.clientY;
    let ghost = null;
    let moved = false;
    let over = null;
    try { c.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    const move = ev => {
      if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 6) return;
      if (!moved) {
        moved = true;
        ghost = c.cloneNode(true);
        ghost.classList.add('ditem-ghost');
        Object.assign(ghost.style, { width: `${r.width}px`, left: `${r.left}px`, top: `${r.top}px` });
        document.body.append(ghost);
        c.style.opacity = '.35';
      }
      ghost.style.transform = `translate(${ev.clientX - sx}px, ${ev.clientY - sy}px)`;
      ghost.style.display = 'none';
      const under = document.elementFromPoint(ev.clientX, ev.clientY);
      ghost.style.display = '';
      const b = under && (under.closest('.bucket') || under.closest('.pool'));
      if (over && over !== b) over.classList.remove('is-over');
      over = b;
      if (over) over.classList.add('is-over');
    };
    const up = () => {
      c.removeEventListener('pointermove', move);
      c.removeEventListener('pointerup', up);
      c.removeEventListener('pointercancel', up);
      c.style.opacity = '';
      if (ghost) ghost.remove();
      if (over) over.classList.remove('is-over');
      if (!moved) { select(c); return; }
      if (over) place(c, over);
    };
    c.addEventListener('pointermove', move);
    c.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', up);
  }

  const el = h('div', pool, h('div.buckets', bEls));
  return {
    el,
    placement: () => Object.fromEntries(chips.map(c => [c.dataset.id, c.parentElement.dataset.b ?? null])),
    chips: () => chips,
    allPlaced: () => !pool.querySelector('.ditem'),
    lock: () => { locked = true; },
  };
}
