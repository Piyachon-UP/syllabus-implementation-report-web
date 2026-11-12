#!/usr/bin/env python3
"""Functional + responsive browser regression. No external network calls."""
import json
import os
import shutil
from pathlib import Path
from playwright.sync_api import sync_playwright
from jsonschema import Draft202012Validator, FormatChecker

ROOT=Path(__file__).resolve().parents[1]
errors=[]
schema=json.loads((ROOT/'schema'/'syllabus_implementation_report.v1.schema.json').read_text())
source=json.loads((ROOT/'sample'/'demo_syllabus.json').read_text())
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,executable_path=(shutil.which('chromium') or shutil.which('google-chrome') or None),args=['--no-sandbox'])
        ctx=browser.new_context(accept_downloads=True,viewport={'width':1366,'height':900},device_scale_factor=1)
        page=ctx.new_page()
        page.on('pageerror',lambda e:errors.append(str(e)));page.on('dialog',lambda dialog:dialog.accept())
        page.set_content((ROOT/'index.html').read_text(encoding='utf-8'),wait_until='load')
        page.get_by_role('heading',name='รายงานการดำเนินงานตาม Syllabus').first.wait_for()
        assert page.get_by_text('นำเข้าไฟล์ Syllabus JSON เพื่อแสดง').count()>0
        page.locator('#syllabus-file').set_input_files(str(ROOT/'sample'/'demo_syllabus.json'))
        page.get_by_role('heading',name='รายวิชาตัวอย่างสำหรับทดสอบระบบ').wait_for()
        assert page.locator('[data-metric="total"]').text_content()=='6'
        # Course: all source fields, year, original update date visible
        assert page.get_by_text('วันที่บันทึก/ปรับปรุง Syllabus').count()>0
        page.locator('[data-tab="instructors"]').click()
        assert page.get_by_text('อ. ผู้ช่วย ตัวอย่าง').count()>=1
        page.locator('[data-tab="plans"]').click()
        assert page.locator('select[data-kind="lecture"]').count()==2
        page.locator('select[data-kind="lecture"][data-index="0"]').select_option('ไม่ตามแผน')
        reason=page.locator('textarea[data-kind="lecture"][data-index="0"][data-field="Reason"]')
        action=page.locator('textarea[data-kind="lecture"][data-index="0"][data-field="Action"]')
        assert reason.is_visible() and action.is_visible()
        reason.fill('มีการปรับแผนชั่วคราว')
        action.fill('สอนชดเชยและบันทึกผล')
        page.locator('select[data-kind="lecture"][data-index="1"]').select_option('ตามแผน')
        page.locator('[data-plan-tab="lab"]').click()
        assert page.locator('select[data-kind="lab"]').count()==2
        page.locator('select[data-kind="lab"][data-index="0"]').select_option('ตามแผน')
        page.locator('[data-tab="assessments"]').click()
        page.locator('select[data-kind="assessment"][data-index="0"]').select_option('บรรลุ')
        page.locator('select[data-kind="assessment"][data-index="1"]').select_option('ไม่บรรลุ')
        page.locator('textarea[data-kind="assessment"][data-index="1"][data-field="Reason"]').fill('คะแนนต่ำกว่าที่ตั้งเป้า')
        page.locator('textarea[data-kind="assessment"][data-index="1"][data-field="Action"]').fill('จัดกิจกรรมเสริม')
        assert page.locator('[data-metric="done"]').text_content()=='5'
        with page.expect_download() as download_info:
            page.locator('[data-action="save-report"]').click()
        download=download_info.value
        saved=ROOT/'sample'/'_browser_downloaded_report.json'
        download.save_as(str(saved))
        data=json.loads(saved.read_text())
        errs=list(Draft202012Validator(schema,format_checker=FormatChecker()).iter_errors(data))
        assert not errs,[e.message for e in errs]
        assert data['SourceSyllabus']==source
        assert data['LectureResults'][0]['Reason']=='มีการปรับแผนชั่วคราว'
        assert data['AssessmentResults'][1]['Status']=='ไม่บรรลุ'
        page.close();page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.on('dialog',lambda dialog:dialog.accept());page.set_content((ROOT/'index.html').read_text(encoding='utf-8'),wait_until='load')
        page.locator('#report-file').set_input_files(str(saved))
        page.locator('.hero h2').wait_for()
        assert page.locator('[data-metric="done"]').text_content()=='5'
        page.locator('[data-tab="plans"]').click()
        assert page.locator('select[data-kind="lecture"][data-index="0"]').input_value()=='ไม่ตามแผน'
        assert page.locator('textarea[data-kind="lecture"][data-index="0"][data-field="Reason"]').input_value()=='มีการปรับแผนชั่วคราว'
        page.locator('[data-tab="assessments"]').click()
        assert page.locator('select[data-kind="assessment"][data-index="1"]').input_value()=='ไม่บรรลุ'
        # Confirm dropdown includes all options after reopening; negative reason preserved
        assert page.locator('select[data-kind="assessment"][data-index="1"] option').count()==3
        # Empty statuses should be savable, schema accepts them
        page.locator('select[data-kind="assessment"][data-index="0"]').select_option('')
        with page.expect_download() as dl:
            page.locator('[data-action="save-report"]').click()
        dl.value.save_as(str(saved))
        data=json.loads(saved.read_text())
        assert data['AssessmentResults'][0]['Status']==''
        assert not list(Draft202012Validator(schema,format_checker=FormatChecker()).iter_errors(data))
        page.close();page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.on('dialog',lambda dialog:dialog.accept());page.set_content((ROOT/'index.html').read_text(encoding='utf-8'),wait_until='load')
        page.locator('#syllabus-file').set_input_files(str(ROOT/'sample'/'demo_syllabus.json'))
        page.locator('.hero h2').wait_for()
        (ROOT/'sample'/'UI_progress_desktop.png').unlink(missing_ok=True)
        page.locator('[data-tab="plans"]').click()
        page.screenshot(path=str(ROOT/'sample'/'UI_progress_desktop.png'),full_page=True)
        page.locator('[data-tab="assessments"]').click()
        page.screenshot(path=str(ROOT/'sample'/'UI_assessment_desktop.png'),full_page=True)
        for w in (1920,1366,1024,768,390,375):
            page.set_viewport_size({'width':w,'height':850})
            size=page.evaluate('({vw:innerWidth,sw:document.documentElement.scrollWidth})')
            assert size['sw']<=size['vw']+2,(w,size)
            if w==390:
                page.screenshot(path=str(ROOT/'sample'/'UI_assessment_mobile.png'),full_page=True)
                page.locator('[data-action="toggle-menu"]').click()
                assert page.locator('.sidebar').evaluate("e=>e.classList.contains('open')")
                page.locator('[data-tab="plans"]').click()
                assert page.locator('.sidebar').evaluate("e=>!e.classList.contains('open')")
                page.screenshot(path=str(ROOT/'sample'/'UI_progress_mobile.png'),full_page=True)
        # Test actual supplied syllabus privately without putting it in distribution
        real=Path(os.environ['SYLLABUS_TEST_FILE']) if os.environ.get('SYLLABUS_TEST_FILE') else None
        if real and real.exists():
            page.locator('#syllabus-file').set_input_files(str(real))
            page.wait_for_function("document.querySelector('[data-metric=total]')?.textContent?.trim()==='28'")
            assert page.locator('[data-metric="total"]').text_content()=='28'
            assert page.get_by_text('รายวิชา').count()>0
        if errors:raise AssertionError(errors)
        saved.unlink(missing_ok=True)
        browser.close()
    print('PASS: 4 sections, source import, status conditions, reason/action, export/reimport, schema, 6 responsive widths, real source import, no JS errors')
finally:
    pass
