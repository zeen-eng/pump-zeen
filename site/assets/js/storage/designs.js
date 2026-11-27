// ═══════════════════════════════════════════════════════════════
// حفظ التصاميم — نفس الواجهة للمزوّدين:
// list() → [{id, name, updated}]   load(id) → object   save(name, data, id?) → id   remove(id)
// ═══════════════════════════════════════════════════════════════
import { auth } from '../auth/index.js';
import { t } from '../i18n/index.js';

const MAX = 60;
const clip = s => String(s || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, MAX) || t('تصميم بدون اسم');

const supa = {
  async list() {
    const rows = await auth.rest('/rest/v1/designs?select=id,name,updated_at&order=updated_at.desc&limit=100');
    return (rows || []).map(r => ({ id: r.id, name: r.name, updated: Date.parse(r.updated_at) }));
  },
  async load(id) {
    const rows = await auth.rest('/rest/v1/designs?select=data&id=eq.' + encodeURIComponent(id));
    return rows?.[0]?.data ?? null;
  },
  async save(name, data, id) {
    if (id) {
      await auth.rest('/rest/v1/designs?id=eq.' + encodeURIComponent(id), { method: 'PATCH', body: { name: clip(name), data } });
      return id;
    }
    const r = await auth.rest('/rest/v1/designs', { method: 'POST', body: { name: clip(name), data }, prefer: 'return=representation' });
    return r?.[0]?.id;
  },
  async remove(id) { await auth.rest('/rest/v1/designs?id=eq.' + encodeURIComponent(id), { method: 'DELETE' }); },
};

const claude = {
  coll() { const db = auth.db(), u = auth.user(); if (!db || !u) throw new Error(t('الحفظ غير متاح في هذا العرض.')); return db.collection('data/users/' + u.id); },
  async list() {
    const q = await this.coll().orderBy('at', 'desc').limit(100).get();
    return q.docs.map(d => { const v = d.data() || {}; return { id: d.id, name: String(v.name || ''), updated: Number(v.at) || 0 }; });
  },
  async load(id) { const d = await this.coll().doc(id).get(); if (!d.exists) return null; try { return JSON.parse(String(d.data().st || '')); } catch { return null; } },
  async save(name, data, id) {
    id = id || 'd' + Date.now().toString(36);
    await this.coll().doc(id).set({ name: clip(name), at: Date.now(), st: JSON.stringify(data) });
    return id;
  },
  async remove(id) { await this.coll().doc(id).delete(); },
};

export const designs = auth.name === 'claude' ? claude : supa;
