#!/usr/bin/env python3
"""Browser-based export regression: actual DOCX downloads, ZIP integrity, Thai content, responsive footer."""
from pathlib import Path
from zipfile import ZipFile
import json, shutil
from lxml import etree
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
errors=[]
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True, executable_path=shutil.which('chromium'), args=['--no-sandbox'])
    context=browser.new_context(accept_downloads=True,viewport={'width':1366,'height':850})
    page=context.new_page()
    page.on('pageerror',lambda e: errors.append(str(e)))
    page.on('dialog',lambda d:d.accept())
    page.set_content((ROOT/'index.html').read_text(encoding='utf-8'),wait_until='load')
    page.locator('#report-file').set_input_files(str(ROOT/'sample/demo_report.json'))
    page.locator('.hero h2').wait_for()
    assert 'v0.2.0' in page.locator('.logo').inner_text()
    assert page.locator('[data-action="export-docx"]').is_visible()
    # No mutations to an opened report when only generating DOCX.
    before=page.evaluate('JSON.stringify(window.__syllabusReportTest?.getReport?.()||{})')
    with page.expect_download() as d:
        page.locator('[data-action="export-docx"]').click()
    downloaded=d.value
    assert downloaded.suggested_filename.endswith('.docx'),downloaded.suggested_filename
    path=ROOT/'sample'/'_generated_from_browser.docx'
    downloaded.save_as(str(path))
    with ZipFile(path) as z:
        assert z.testzip() is None
        doc=z.read('word/document.xml')
        etree.fromstring(doc)
        xml=doc.decode('utf-8')
        for s in ['รายงานผลการดำเนินงานตาม Syllabus','ไม่ตามแผน','ไม่บรรลุ','ผลการจัดการเรียนการสอนภาคบรรยาย','สาเหตุ','การดำเนินการ','ให้ข้อเสนอแนะและมอบหมายส่งงานเพิ่มเติม']:
            assert s in xml, s
    # Retain status and browser’s unsaved indicator. DOCX isn't a replacement for report JSON save.
    assert page.locator('[data-action="save-report"]').is_visible()
    before=page.evaluate("JSON.stringify(window.__syllabusReportTest?.getReport?.()||{})")
    page.locator('[data-tab="plans"]').click()
    page.locator('select[data-kind="lecture"][data-index="0"]').select_option('ตามแผน')
    assert 'ยังไม่ได้บันทึก' in page.locator('#save-indicator').inner_text()
    with page.expect_download() as d2:
        page.locator('[data-action="export-docx"]').click()
    assert d2.value.suggested_filename.endswith('.docx')
    assert 'ยังไม่ได้บันทึก' in page.locator('#save-indicator').inner_text()
    # Responsive footer check
    page.set_viewport_size({'width':390,'height':800})
    assert page.locator('[data-action="export-docx"]').is_visible()
    assert page.locator('[data-action="save-report"]').is_visible()
    size=page.evaluate('({vw:innerWidth,sw:document.documentElement.scrollWidth})')
    assert size['sw']<=size['vw']+2, size
    page.screenshot(path=str(ROOT/'sample/UI_v0_2_mobile_docx.png'),full_page=False)
    page.set_viewport_size({'width':1366,'height':850})
    page.screenshot(path=str(ROOT/'sample/UI_v0_2_desktop_docx.png'),full_page=False)
    assert not errors, errors
    path.unlink(missing_ok=True)
    browser.close()
print('PASS: browser DOCX download; OOXML parse; Thai data, report status, unsaved state, mobile/desktop UI; JS errors 0')
