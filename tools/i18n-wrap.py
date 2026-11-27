"""
يلفّ النصوص العربية في ملفات JavaScript بدالة الترجمة t().
  'نص'              → t('نص')
  `نص ${a} و${b}`   → t('نص {0} و{1}', [a, b])
لا يمس التعليقات، ولا القوالب التي تحتوي HTML (تُعالج يدوياً)، ولا ما هو ملفوف أصلاً.
الاستخدام: python3 tools/i18n-wrap.py file.js [...]
"""
import re, sys

AR = re.compile('[؀-ۿ]')

def find_template_end(s, i):
    """i يشير بعد ` الافتتاحية. يعيد (موضع ` الختامية، قائمة الأجزاء)"""
    parts, buf, j = [], '', i
    while j < len(s):
        c = s[j]
        if c == '\\': buf += s[j:j+2]; j += 2; continue
        if c == '`': parts.append(('str', buf)); return j, parts
        if c == '$' and s[j+1:j+2] == '{':
            parts.append(('str', buf)); buf = ''
            k, depth = j + 2, 1
            while depth:
                ch = s[k]
                if ch in '\'"':
                    q = ch; k += 1
                    while s[k] != q: k += 2 if s[k] == '\\' else 1
                elif ch == '`':
                    e, _ = find_template_end(s, k + 1); k = e
                elif ch == '{': depth += 1
                elif ch == '}': depth -= 1
                k += 1
            parts.append(('expr', s[j+2:k-1])); j = k; continue
        buf += c; j += 1
    raise ValueError('unterminated template')

def process(src):
    out, i, n = [], 0, len(src)
    prev_sig = ''
    while i < n:
        c = src[i]
        # التعليقات
        if src.startswith('//', i):
            e = src.find('\n', i); e = n if e < 0 else e
            out.append(src[i:e]); i = e; continue
        if src.startswith('/*', i):
            e = src.find('*/', i) + 2; out.append(src[i:e]); i = e; continue
        # تعبير منتظم
        if c == '/' and prev_sig in '(,=:[!&|?{};+' :
            j = i + 1; in_cls = False
            while j < n:
                ch = src[j]
                if ch == '\\': j += 2; continue
                if ch == '[': in_cls = True
                elif ch == ']': in_cls = False
                elif ch == '/' and not in_cls: break
                elif ch == '\n': break
                j += 1
            j += 1
            while j < n and src[j].isalpha(): j += 1
            out.append(src[i:j]); i = j; prev_sig = '/'; continue
        # نص عادي
        if c in '\'"':
            j = i + 1
            while src[j] != c: j += 2 if src[j] == '\\' else 1
            lit = src[i:j+1]
            already = re.search(r'(?<![\w$.])t\($', ''.join(out[-6:]).rstrip()) is not None
            if AR.search(lit) and not already:
                out.append('t(' + "'" + lit[1:-1].replace("'", "\\'") + "')" if c == '"' else 't(' + lit + ')')
            else:
                out.append(lit)
            i = j + 1; prev_sig = c; continue
        # قالب
        if c == '`':
            e, parts = find_template_end(src, i + 1)
            raw = src[i:e+1]
            text = ''.join(p for k, p in parts if k == 'str')
            if AR.search(text) and '<' not in text:
                fmt, args, idx = '', [], 0
                for k, p in parts:
                    if k == 'str': fmt += p
                    else:
                        fmt += '{' + str(idx) + '}'; args.append(process(p)); idx += 1
                fmt = fmt.replace("'", "\\'")
                out.append("t('" + fmt + "'" + (', [' + ', '.join(args) + ']' if args else '') + ')')
            else:
                # داخل القالب HTML: نعالج التعبيرات فقط
                rebuilt = '`'
                for k, p in parts:
                    rebuilt += p if k == 'str' else '${' + process(p) + '}'
                out.append(rebuilt + '`')
            i = e + 1; prev_sig = '`'; continue
        if not c.isspace(): prev_sig = c
        out.append(c); i += 1
    return ''.join(out)

for path in sys.argv[1:]:
    src = open(path, encoding='utf-8').read()
    new = process(src)
    if new != src:
        if "from '../i18n/index.js'" not in new and 'i18n/index.js' not in path:
            depth = path.split('assets/js/')[1].count('/')
            rel = ('../' * depth) or './'
            imp = f"import {{ t }} from '{rel}i18n/index.js';\n"
            m = list(re.finditer(r'^import .*?;\n', new, re.M))
            pos = m[-1].end() if m else 0
            if not m:  # بعد التعليق العلوي
                mm = re.match(r'(\s*//[^\n]*\n)+', new); pos = mm.end() if mm else 0
            new = new[:pos] + imp + new[pos:]
        open(path, 'w', encoding='utf-8').write(new)
        print('wrapped', path, new.count('t(') - src.count('t('))
