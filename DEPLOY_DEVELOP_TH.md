# ขั้นตอนอัปเดต DOCX Export v0.2.0 บน Branch develop

1. ดาวน์โหลดไฟล์ `Smart_Syllabus_Implementation_Report_Web_v0_2_0_Patch.zip` และ Extract All
2. ไปที่ `https://github.com/Piyachon-UP/syllabus-implementation-report-web/tree/develop`
3. เลือก Branch **develop** ให้ถูกต้องก่อนทำการเปลี่ยนแปลง (GitHub Pages ยังคงเผยแพร่จาก **main**)
4. อัปโหลด/แทนที่ไฟล์ในตำแหน่งเดิมตามโครงสร้าง ZIP:
   - `index.html` ที่ Root
   - `src/app.js`, `src/styles.css`, และ **เพิ่ม** `src/report_docx.js`
   - `tools/build.py` และ **เพิ่ม** `tools/test_docx.py`
   - `README_TH.md`, `DEPLOY_DEVELOP_TH.md`, `CHANGELOG_TH.md`
5. Commit ใน **develop** ด้วยข้อความ `Add browser-only report DOCX export v0.2.0`
6. คลิก **Code → Download ZIP** จาก Branch `develop` แล้วแตกไฟล์
7. เปิด PowerShell ในโฟลเดอร์ที่มี `index.html` แล้วรัน `py -3 -m http.server 8000`
8. เปิด `http://localhost:8000/` และกด `Ctrl + Shift + R`
9. นำเข้า `sample/demo_report.json` ผ่านปุ่ม **เปิดรายงานเดิม** แล้วตรวจปุ่ม **สร้าง DOCX** ใน Sticky Footer
10. กด DOCX → ตรวจว่าไฟล์ดาวน์โหลดและเปิดใน Microsoft Word ได้ รวมถึงข้อความภาษาไทยและตารางทุกส่วน
11. เปลี่ยนสถานะ Lecture เป็น `ไม่ตามแผน` และใส่สาเหตุ/การดำเนินการ → สร้าง DOCX ซ้ำ แล้วตรวจว่าข้อมูลใหม่แสดงครบ
12. กด **บันทึกรายงาน JSON** ตรวจว่าเปิดกลับมาแก้ไขต่อได้ตามเดิม และ JSON Schema ไม่เปลี่ยน
13. เมื่อทดสอบผ่านจึงสร้าง Pull Request: **base = main**, **compare = develop** แล้ว Merge เพื่ออัปเดต GitHub Pages

**ข้อควรระวัง:** การสร้าง DOCX เป็นการส่งออกเพื่ออ่าน/พิมพ์ *ไม่ใช่การบันทึกงาน* ควรกดบันทึก JSON ก่อนปิด Browser และห้ามนำไฟล์ JSON รายวิชาจริงขึ้น Public Repository
