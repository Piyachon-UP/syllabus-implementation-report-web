#!/usr/bin/env python3
"""Build one self-contained index.html for GitHub Pages / direct file opening."""
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
template = (ROOT / 'src' / 'index.template.html').read_text(encoding='utf-8')
css = (ROOT / 'src' / 'styles.css').read_text(encoding='utf-8')
js = (ROOT / 'src' / 'app.js').read_text(encoding='utf-8')
docx_js = (ROOT / 'src' / 'report_docx.js').read_text(encoding='utf-8')
assert '/* APP_STYLES */' in template and '/* APP_SCRIPT */' in template
output = template.replace('/* APP_STYLES */', css).replace('/* APP_SCRIPT */', (docx_js + '\n' + js).replace('</script', '<\\/script'))
(ROOT / 'index.html').write_text(output, encoding='utf-8')
print('Built index.html', (ROOT/'index.html').stat().st_size, 'bytes')
