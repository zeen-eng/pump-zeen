// نافذة «تصاميمي»: حفظ، فتح، حذف
import { el } from '../core/dom.js';
import { date } from '../core/format.js';
import { openDialog, closeDialog, toast, confirmButton } from './common.js';
import { designs } from '../storage/designs.js';
import { cleanDesign } from '../core/sanitize.js';
import { t } from '../i18n/index.js';

export function openSaved(getState, { currentId, onOpen, onSaved }) {
  const s = getState();
  const list = el('div', { style: 'display:grid;gap:0;margin-top:16px' }, el('p', { class: 'muted small', text: t('جارٍ التحميل…') }));
  const nameIn = el('input', { class: 'input', id: 'dname', maxlength: 60, value: s.name || '', placeholder: t('مثال: فيلا حي الملقا') });
  const saveBtn = el('button', { class: 'btn primary', text: currentId ? t('حفظ التعديلات') : t('حفظ التصميم') });
  const saveAs = currentId ? el('button', { class: 'btn', text: t('حفظ كنسخة جديدة') }) : null;
  const doSave = async asNew => {
    saveBtn.disabled = true;
    try { const st = getState(); st.name = nameIn.value; const id = await designs.save(nameIn.value, st, asNew ? null : currentId); onSaved(id); toast(t('حُفظ التصميم')); closeDialog(); }
    catch (e) { toast(e.message || t('تعذّر الحفظ')); } finally { saveBtn.disabled = false; }
  };
  saveBtn.onclick = () => doSave(false); if (saveAs) saveAs.onclick = () => doSave(true);

  const top = s.building ? el('div', {}, el('div', { class: 'field' }, el('label', { for: 'dname', text: t('اسم التصميم') }), nameIn), el('div', { style: 'display:flex;gap:8px;flex-wrap:wrap' }, saveBtn, saveAs)) : el('p', { class: 'note', text: t('ابدأ تصميماً ثم احفظه هنا.') });
  openDialog({ title: t('تصاميمي'), sub: t('محفوظة في حسابك ولا يراها غيرك.'), body: el('div', {}, top, el('h3', { text: t('المحفوظة'), style: 'font-size:15px;margin-top:22px;padding-bottom:8px;border-bottom:1.5px solid var(--ink)' }), list) });

  const timer = setTimeout(() => list.replaceChildren(el('p', { class: 'muted small', text: t('تعذّر الوصول إلى التصاميم الآن.') })), 10000);
  designs.list().then(items => {
    clearTimeout(timer);
    if (!items.length) { list.replaceChildren(el('p', { class: 'muted small', text: t('لا توجد تصاميم محفوظة بعد.') })); return; }
    list.replaceChildren(...items.map(it => {
      const del = el('button', { class: 'btn sm quiet danger', text: t('حذف') });
      const row = el('div', { style: 'display:flex;gap:10px;align-items:center;padding:10px 0;border-bottom:1px solid var(--rule-soft)' },
        el('div', { style: 'flex:1;min-width:0' }, el('div', { text: it.name, style: 'font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap' }), el('div', { class: 'muted small num', text: it.updated ? date(it.updated) : '' })),
        el('button', { class: 'btn sm', text: t('فتح'), onclick: async () => { try { const d = await designs.load(it.id); if (!d) throw 0; onOpen(cleanDesign(d), it.id); closeDialog(); toast(t('فُتح التصميم')); } catch { toast(t('تعذّر فتح التصميم')); } } }), del);
      confirmButton(del, t('تأكيد الحذف'), async () => { try { await designs.remove(it.id); row.remove(); } catch { toast(t('تعذّر الحذف')); } });
      return row;
    }));
  }).catch(e => { clearTimeout(timer); list.replaceChildren(el('p', { class: 'muted small', text: e.message || t('تعذّر الوصول إلى التصاميم.') })); });
}
