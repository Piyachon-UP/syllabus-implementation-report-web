# Changelog

## v0.2.0 — Browser DOCX Export

- เพิ่มปุ่ม **สร้าง DOCX** ใน Sticky Footer คู่กับ **บันทึกรายงาน JSON**
- สร้าง `.docx` ใน Browser โดยไม่ใช้ Backend/CDN
- เอกสาร A4 แนวนอน: ข้อมูลรายวิชา/หลักสูตร/ผู้สอน, สรุปความคืบหน้า, Lecture/Lab, ผลการประเมิน, สาเหตุและการดำเนินการ
- แสดง **ยังไม่ระบุ** ในรายการที่ยังไม่ได้กรอกผล และเตือนในรายงานเมื่อยังมีข้อมูลไม่ครบ
- เก็บ JSON Report SchemaVersion 1.0.0 และ Syllabus JSON ไว้ตามเดิม
- ไม่ให้การส่งออก Word เปลี่ยนสถานะข้อมูลที่ยังไม่ได้บันทึก JSON
- เพิ่มชุดทดสอบ Browser DOCX Export และ Responsive Footer

## v0.1.0 — Initial Pilot

- นำเข้า Syllabus JSON, บันทึกผล Lecture/Lab/Assessments, บันทึกและเปิด Report JSON, Responsive Web App
