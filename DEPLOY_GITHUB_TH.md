# วิธีเผยแพร่ Syllabus Implementation Report Web บน GitHub Pages

1. เข้า `https://github.com/new` สร้าง Repository ใหม่ชื่อ `syllabus-implementation-report-web` (Public)
2. เปิด Repository ที่สร้าง → `Add file → Upload files`
3. แตกไฟล์ ZIP แล้วอัปโหลดไฟล์/โฟลเดอร์ด้านใน ให้ `index.html` อยู่ Root (ห้ามอัปโหลด ZIP แทน Source Code)
4. Commit เช่น `Initial pilot release: syllabus implementation reporting web v0.1.0`
5. ไปที่ `Settings → Pages → Deploy from a branch` และเลือก Branch `main`, Folder `/(root)` แล้ว Save
6. ไปที่ `Actions` ดูว่างาน `pages build and deployment` แสดง Success
7. เปิด URL `https://YOUR-USERNAME.github.io/syllabus-implementation-report-web/`
8. ทดลองนำเข้า `sample/demo_syllabus.json`, กรอกสถานะ, บันทึก JSON, แล้ว `เปิดรายงานเดิม` อีกครั้ง

**สำคัญ:** สร้าง Repository ใหม่แยกจาก `syllabus-generator-web` เพื่อไม่กระทบเว็บไซต์ที่อาจารย์ใช้งานอยู่ และไม่อัปโหลดไฟล์ Syllabus/Report ของบุคลากรจริงเข้า Public Repository
