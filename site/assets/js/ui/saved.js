// نافذة «تصاميمي»: حفظ، فتح، حذف
import { el } from '../core/dom.js';
import { date } from '../core/format.js';
import { openDialog, closeDialog, toast, confirmButton } from './common.js';
import { designs } from '../storage/designs.js';
import { cleanDesign } from '../core/sanitize.js';

export function openSaved(getState, { currentId, onOpen, onSaved }) {
  const s = getState();
  const list = el('div', { style: 'display:grid;gap:0;margin-top:16px' }, el('p', { class: 'muted small', text: 'جارٍ التحميل…' }));
  const nameIn = el('input', { class: 'input', id: 'dname', maxlength: 60, value: s.name || '', placeholder: 'مثال: فيلا حي الملقا' });
  const saveBtn = el('button', { class: 'btn primary', text: currentId ? 'حفظ التعديلات' : 'حفظ التصميم' });
  const saveAs = currentId ? el('button', { class: 'btn', text: 'حفظ كنسخة جديدة' }) : null;
  const doSave = async asNew => {
    saveBtn.disabled = true;
    try { const st = getState(); st.name = nameIn.value; const id = await designs.save(nameIn.value, st, asNew ? null : currentId); onSaved(id); toast('حُفظ التصميم'); closeDialog(); }
    catch (e) { toast(e.message || 'تعذّر الحفظ'); } finally { saveBtn.disabled = false; }
  };
  saveBtn.onclick = () => doSave(false); if (saveAs) saveAs.onclick = () => doSave(true);

  const top = s.building ? el('div', {}, el('div', { class: 'field' }, el('label', { for: 'dname', text: 'اسم التصميم' }), nameIn), el('div', { style: 'display:flex;gap:8px;flex-wrap:wrap' }, saveBtn, saveAs)) : el('p', { class: 'note', text: 'ابدأ تصميماً ثم احفظه هنا.' });
  openDialog({ title: 'تصاميمي', sub: 'محفوظة في حسابك ولا يراها غيرك.', body: el('div', {}, top, el('h3', { text: 'المحفوظة', style: 'font-size:15px;margin-top:22px;padding-bottom:8px;border-bottom:1.5px solid var(--ink)' }), list) });

  const timer = setTimeout(() => list.replaceChildren(el('p', { class: 'muted small', text: 'تعذّر الوصول إلى التصاميم الآن.' })), 10000);
  designs.list().then(items => {
    clearTimeout(timer);
    if (!items.length) { list.replaceChildren(el('p', { class: 'muted small', text: 'لا توجد تصاميم محفوظة بعد.' })); return; }
    list.replaceChildren(...items.map(it => {
      const del = el('button', { class: 'btn sm quiet danger', text: 'حذف' });
      const row = el('div', { style: 'display:flex;gap:10px;align-items:center;padding:10px 0;border-bottom:1px solid var(--rule-soft)' },
        el('div', { style: 'flex:1;min-width:0' }, el('div', { text: it.name, style: 'font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap' }), el('div', { class: 'muted small num', text: it.updated ? date(it.updated) : '' })),
        el('button', { class: 'btn sm', text: 'فتح', onclick: async () => { try { const d = await designs.load(it.id); if (!d) throw 0; onOpen(cleanDesign(d), it.id); closeDialog(); toast('فُتح التصميم'); } catch { toast('تعذّر فتح التصميم'); } } }), del);
      confirmButton(del, 'تأكيد الحذف', async () => { try { await designs.remove(it.id); row.remove(); } catch { toast('تعذّر الحذف'); } });
      return row;
    }));
  }).catch(e => { clearTimeout(timer); list.replaceChildren(el('p', { class: 'muted small', text: e.message || 'تعذّر الوصول إلى التصاميم.' })); });
}
