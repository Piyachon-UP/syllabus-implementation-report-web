(() => {
  'use strict';

  // Static browser-only report app. Syllabus input is kept intact in SourceSyllabus.
  // The report's JSON format is intentionally separate from Syllabus SchemaVersion 1.0.0.
  const REPORT_VERSION = '1.0.0';
  const APP_VERSION = '0.2.0';
  const tabs = [
    { id: 'course', name: 'ข้อมูลรายวิชา', icon: '01' },
    { id: 'instructors', name: 'ผู้สอน', icon: '02' },
    { id: 'plans', name: 'ผลการจัดการเรียนการสอน', icon: '03' },
    { id: 'assessments', name: 'ผลการประเมิน', icon: '04' }
  ];
  const fieldLabels = {
    CourseCode:'รหัสรายวิชา',CourseTitleTh:'ชื่อรายวิชา (ไทย)',CourseTitleEn:'ชื่อรายวิชา (อังกฤษ)',
    CourseDescriptionTh:'คำอธิบายรายวิชา (ไทย)',CourseDescriptionEn:'คำอธิบายรายวิชา (อังกฤษ)',
    Credits:'หน่วยกิต',LectureHours:'ชั่วโมงบรรยาย',LabHours:'ชั่วโมงปฏิบัติการ',SelfStudyHours:'ชั่วโมงศึกษาด้วยตนเอง',
    AcademicYear:'ปีการศึกษา (พ.ศ.)',Semester:'ภาคเรียน',Section:'กลุ่มเรียน',FacultyName:'คณะ',
    UniversityName:'มหาวิทยาลัย',LastUpdatedDate:'วันที่บันทึก/ปรับปรุง Syllabus',
    CurriculumCode:'รหัสหลักสูตร',CurriculumName:'ชื่อหลักสูตร',ProgramName:'สาขาวิชา',
    DegreeLevel:'ระดับปริญญา',DepartmentName:'สาขาวิชา/หน่วยงาน',
    IsResponsibleInstructor:'ผู้รับผิดชอบรายวิชา',Prefix:'คำนำหน้า',FirstName:'ชื่อ',LastName:'นามสกุล',
    DisplayName:'ชื่อผู้สอน',Department:'สาขาวิชา',StaffId:'รหัสบุคลากร',StaffID:'รหัสบุคลากร',
    Email:'อีเมล',LecturePercent:'สัดส่วนบรรยาย',LabPercent:'สัดส่วนปฏิบัติการ'
  };
  const sectionInfo = {
    course:{title:'ข้อมูลรายวิชา',subtitle:'แสดงรายละเอียดรายวิชาและหลักสูตรจากไฟล์ Syllabus แบบอ่านอย่างเดียว'},
    instructors:{title:'ข้อมูลผู้รับผิดชอบรายวิชาและผู้สอน',subtitle:'แสดงข้อมูลผู้สอนทุกคนจากไฟล์ Syllabus โดยไม่เปลี่ยนแปลงข้อมูลต้นฉบับ'},
    plans:{title:'รายงานผลการจัดการเรียนการสอน',subtitle:'ระบุผลการดำเนินงานตามแผนทุกสัปดาห์ ทั้งภาคบรรยายและปฏิบัติการ'},
    assessments:{title:'รายงานผลการวัดและประเมินผล',subtitle:'ระบุผลบรรลุ/ไม่บรรลุ พร้อมสาเหตุและการดำเนินการแก้ไขเมื่อไม่บรรลุ'}
  };
  const app = document.getElementById('app');
  let report = null;
  let activeTab = 'course';
  let planTab = 'lecture';
  let mobileOpen = false;
  let unsaved = false;
  let toastTimeout = null;

  function esc(val) { return String(val == null ? '' : val).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function normalizeText(v) {return v == null ? '' : typeof v === 'boolean' ? (v ? 'ใช่' : 'ไม่ใช่') : typeof v === 'object' ? Array.isArray(v) ? v.map(normalizeText).join(', ') : JSON.stringify(v) : String(v);}
  function fmt(v) {const t=normalizeText(v);return t.trim() ? t : '—';}
  function fileSafe(x) {return String(x||'unknown').replace(/[^a-zA-Z0-9ก-๙_-]/g,'_').slice(0,95);}
  function todayLocal() {const d=new Date();const off=d.getTimezoneOffset()*60000;return new Date(d.getTime()-off).toISOString().slice(0,10);}
  function timeISO() {return new Date().toISOString();}
  function isObj(x) {return x !== null && typeof x === 'object' && !Array.isArray(x);}
  function validSyllabus(s) {
    if(!isObj(s) || !isObj(s.CourseInfo) || !Array.isArray(s.Instructors) || !Array.isArray(s.LecturePlans) || !Array.isArray(s.LabPlans) || !Array.isArray(s.Assessments)) {
      throw new Error('ไฟล์นี้ไม่ใช่ Syllabus JSON ที่รองรับ: ต้องมี CourseInfo, Instructors, LecturePlans, LabPlans และ Assessments');
    }
    if(s.SchemaVersion && String(s.SchemaVersion).split('.')[0] !== '1') throw new Error('ยังไม่รองรับ Syllabus SchemaVersion นี้');
    return true;
  }
  function makeRows(rows) {return rows.map((p,i)=>({SourceIndex:i,WeekNumber:p.WeekNumber??null,Status:'',Reason:'',Action:''}));}
  function makeAssessmentRows(rows) {return rows.map((_,i)=>({SourceIndex:i,Status:'',Reason:'',Action:''}));}
  function makeReport(syllabus, filename='') {
    validSyllabus(syllabus);
    const s=JSON.parse(JSON.stringify(syllabus));
    return {ReportSchemaVersion:REPORT_VERSION, ReportType:'SyllabusImplementation',
      SourceOfferingId:String(s.OfferingId||''),SourceFileName:filename,SourceSyllabus:s,
      CreatedAt:timeISO(),UpdatedAt:timeISO(),ReportDate:todayLocal(),
      LectureResults:makeRows(s.LecturePlans),LabResults:makeRows(s.LabPlans),
      AssessmentResults:makeAssessmentRows(s.Assessments)};
  }
  function normalizeRows(existing, source, isPlan, choices) {
    const byIndex=new Map((Array.isArray(existing)?existing:[]).filter(x=>isObj(x)&&Number.isInteger(x.SourceIndex)).map(x=>[x.SourceIndex,x]));
    return source.map((p,i)=>{
      const old=byIndex.get(i)||{};
      return {SourceIndex:i,...(isPlan?{WeekNumber:p.WeekNumber??null}:{}),
        Status:choices.includes(old.Status)?old.Status:'',Reason:String(old.Reason??''),Action:String(old.Action??'')};
    });
  }
  function normalizeReport(raw) {
    if(!isObj(raw)||raw.ReportType!=='SyllabusImplementation'||!raw.SourceSyllabus) throw new Error('ไฟล์นี้ไม่ใช่รายงานผลการดำเนินงานของระบบนี้');
    if(String(raw.ReportSchemaVersion||'').split('.')[0]!=='1') throw new Error('ยังไม่รองรับเวอร์ชันรายงานนี้');
    validSyllabus(raw.SourceSyllabus);
    const cloned=JSON.parse(JSON.stringify(raw));
    cloned.LectureResults=normalizeRows(raw.LectureResults,cloned.SourceSyllabus.LecturePlans,true,['ตามแผน','ไม่ตามแผน','']);
    cloned.LabResults=normalizeRows(raw.LabResults,cloned.SourceSyllabus.LabPlans,true,['ตามแผน','ไม่ตามแผน','']);
    cloned.AssessmentResults=normalizeRows(raw.AssessmentResults,cloned.SourceSyllabus.Assessments,false,['บรรลุ','ไม่บรรลุ','']);
    cloned.ReportDate=typeof raw.ReportDate==='string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.ReportDate)?raw.ReportDate:'';
    return cloned;
  }
  function stats() {
    if(!report) return {total:0,done:0,problem:0,missing:0,incomplete:0,plan:0,assess:0};
    const all=[...report.LectureResults,...report.LabResults,...report.AssessmentResults];
    return {total:all.length,done:all.filter(r=>!!r.Status).length,
      problem:all.filter(r=>r.Status==='ไม่ตามแผน'||r.Status==='ไม่บรรลุ').length,
      missing:all.filter(r=>!r.Status).length,
      incomplete:all.filter(r=>(r.Status==='ไม่ตามแผน'||r.Status==='ไม่บรรลุ')&&(!r.Reason.trim()||!r.Action.trim())).length,
      plan:report.LectureResults.length+report.LabResults.length,assess:report.AssessmentResults.length};
  }
  function readSource() {return report?.SourceSyllabus||null;}
  function getCourseName() {const c=readSource()?.CourseInfo||{};return c.CourseTitleTh||c.CourseTitleEn||'ยังไม่มีชื่อรายวิชา';}
  function getOffering() {const s=readSource()||{};const c=s.CourseInfo||{};return s.OfferingId || [c.CourseCode||'COURSE',c.Semester||'TERM',c.AcademicYear||'YEAR',c.Section||'SECTION'].join('-');}
  function showToast(message,error=false) {
    const existing=document.querySelector('.toast');if(existing) existing.remove();if(toastTimeout)clearTimeout(toastTimeout);
    const el=document.createElement('div');el.className='toast'+(error?' error':'');el.setAttribute('role','status');el.textContent=message;document.body.append(el);
    toastTimeout=setTimeout(()=>el.remove(),5200);
  }
  function markUnsaved() {unsaved=true;const e=document.getElementById('save-indicator');if(e)e.textContent='มีข้อมูลเปลี่ยนแปลงที่ยังไม่ได้บันทึก JSON';}
  function countPill() {const s=stats();return `${s.done}/${s.total} รายการ`;}
  function renderNav() {return tabs.map(t=>`<button class="nav-item ${activeTab===t.id?'active':''}" data-tab="${t.id}" type="button" aria-current="${activeTab===t.id?'page':'false'}"><span class="nav-number">${t.icon}</span>${t.name}</button>`).join('');}
  function renderCards() {const s=stats();return `<div class="stats" aria-label="สรุปความคืบหน้า">
    <div class="stat"><span>รายการทั้งหมด</span><strong data-metric="total">${s.total}</strong><small>Lecture / Lab / การประเมิน</small></div>
    <div class="stat"><span>ระบุผลแล้ว</span><strong data-metric="done">${s.done}</strong><div class="progress"><div data-progress style="width:${s.total?s.done/s.total*100:0}%"></div></div></div>
    <div class="stat"><span>ไม่ตามแผน / ไม่บรรลุ</span><strong data-metric="problem">${s.problem}</strong><small>รายการที่ต้องระบุสาเหตุและการดำเนินการ</small></div>
    <div class="stat"><span>ยังไม่ระบุผล</span><strong data-metric="missing">${s.missing}</strong><small data-metric="incomplete">${s.incomplete?`กรอกสาเหตุ/การดำเนินการไม่ครบ ${s.incomplete} รายการ`:'สาเหตุ/การดำเนินการครบตามที่ระบุ'}</small></div>
  </div>`;}
  function renderInfo(obj) {
    const entries=Object.entries(isObj(obj)?obj:{});
    if(!entries.length)return `<div class="empty-table">ไม่มีข้อมูลในไฟล์ต้นฉบับ</div>`;
    return `<dl class="grid-info">${entries.map(([k,v])=>{
      const isLong=/Description|Details|Note/i.test(k)||normalizeText(v).length>90;
      return `<div class="info-cell ${isLong?'span':''}"><dt>${esc(fieldLabels[k]||k)}</dt><dd>${esc(fmt(v))}</dd></div>`;
    }).join('')}</dl>`;
  }
  function panel(title,content,description='',extra='') {return `<section class="panel"><div class="panel-head"><div><h3>${esc(title)}</h3>${description?`<p>${esc(description)}</p>`:''}</div>${extra}</div><div class="panel-body">${content}</div></section>`;}
  function renderCourse() {
    const syllabus=readSource();return `${panel('ข้อมูลรายวิชา (Course Info)',renderInfo(syllabus.CourseInfo),'อ่านอย่างเดียว • แสดงทุกฟิลด์ที่อยู่ใน Syllabus JSON')}
      ${panel('หลักสูตร (Curriculum)',renderInfo(syllabus.Curriculum),'ข้อมูลอ้างอิงจากไฟล์ Syllabus')}
      ${panel('ข้อมูลไฟล์ต้นฉบับ',renderInfo({OfferingId:syllabus.OfferingId||'',SchemaVersion:syllabus.SchemaVersion||'',SourceType:syllabus.SourceType||'',ExtractedAt:syllabus.ExtractedAt||'',SourceFileName:report.SourceFileName||''}))}`;
  }
  function renderInstructors() {
    const items=readSource().Instructors;
    if(!items.length)return panel('รายชื่อผู้สอน',`<div class="empty-table">ไม่มีรายชื่อผู้สอนใน Syllabus JSON</div>`);
    const keys=[...new Set(items.flatMap(Object.keys))];
    return `<section class="panel"><div class="panel-head"><div><h3>ข้อมูลผู้สอนทั้งหมด</h3><p>แสดงข้อมูลทุกฟิลด์ตามที่บันทึกไว้ใน JSON</p></div><span class="pill">${items.length} คน</span></div><div class="table-scroller"><table class="data-table responsive-table"><thead><tr><th>#</th>${keys.map(k=>`<th>${esc(fieldLabels[k]||k)}</th>`).join('')}</tr></thead><tbody>${items.map((row,i)=>`<tr><td data-label="ลำดับ">${i+1}</td>${keys.map(k=>`<td data-label="${esc(fieldLabels[k]||k)}">${esc(fmt(row[k]))}</td>`).join('')}</tr>`).join('')}</tbody></table></div></section>`;
  }
  function statusSelect(kind,i,current) {
    const choices=kind==='assessment'?['','บรรลุ','ไม่บรรลุ']:['','ตามแผน','ไม่ตามแผน'];
    const stClass=(current==='ไม่ตามแผน'||current==='ไม่บรรลุ')?'value-bad':current?'value-ok':'';
    return `<select class="status-select ${stClass}" data-kind="${kind}" data-index="${i}" data-field="Status" aria-label="${kind==='assessment'?'ผลการประเมิน':'ผลการจัดการเรียนการสอน'} รายการที่ ${i+1}">
    ${choices.map((x,j)=>`<option value="${esc(x)}" ${x===current?'selected':''}>${j===0?'— ยังไม่ระบุ —':esc(x)}</option>`).join('')}</select>`;
  }
  function resultColumn(kind,i,record,field) {
    const negative=record.Status==='ไม่ตามแผน'||record.Status==='ไม่บรรลุ';
    if(!negative)return `<span class="field-hint">เลือก “${kind==='assessment'?'ไม่บรรลุ':'ไม่ตามแผน'}” เพื่อกรอก</span>`;
    const blank=!record[field].trim();return `<div><textarea class="form-control ${blank?'invalid':''}" rows="2" maxlength="2000" data-kind="${kind}" data-index="${i}" data-field="${field}" aria-label="${field==='Reason'?'ระบุสาเหตุ':'ระบุการดำเนินการ'} รายการที่ ${i+1}">${esc(record[field])}</textarea>${blank?'<div class="error-msg">กรุณาระบุข้อมูลเมื่อเลือกผลเป็นลบ (ยังบันทึก JSON ได้)</div>':''}</div>`;
  }
  function planData(kind) {return kind==='lecture'?[readSource().LecturePlans,report.LectureResults]:[readSource().LabPlans,report.LabResults];}
  function renderPlan() {
    const kind=planTab;const [plans,results]=planData(kind);const all=kind==='lecture'?report.LectureResults:report.LabResults;
    const title=kind==='lecture'?'ภาคบรรยาย (Lecture)':'ภาคปฏิบัติการ (Lab)';
    return `<div class="tabs" role="tablist" aria-label="ประเภทแผนการสอน"><button type="button" class="${kind==='lecture'?'active':''}" data-plan-tab="lecture" role="tab" aria-selected="${kind==='lecture'}">บรรยาย <span>(${readSource().LecturePlans.length})</span></button><button type="button" class="${kind==='lab'?'active':''}" data-plan-tab="lab" role="tab" aria-selected="${kind==='lab'}">ปฏิบัติการ <span>(${readSource().LabPlans.length})</span></button></div>
      <section class="panel"><div class="panel-head"><div><h3>ผลการสอน${title}</h3><p>แสดงคอลัมน์แผนเดิมจาก Syllabus และเพิ่มผลการดำเนินงานแยกแต่ละสัปดาห์</p></div><span class="pill">${all.filter(r=>!!r.Status).length}/${all.length} ระบุผลแล้ว</span></div>
      ${plans.length?`<div class="table-scroller"><table class="data-table responsive-table training-table"><thead><tr><th>สัปดาห์</th><th>หัวข้อ / กิจกรรมการเรียนรู้</th><th>วิธีสอน</th><th>CLO</th><th>ผู้สอน</th><th>ผลการสอน</th><th>สาเหตุ</th><th>การดำเนินการ</th></tr></thead><tbody>
      ${plans.map((p,i)=>{const r=results[i];const notes=p.Notes||p.InstructorNames||'';const topic=p.Topic||p.LearningActivities||'—';const method=normalizeText(p.TeachingMethods||p.TeachingMethod||'');const mClo=normalizeText(p.MappedCloCodes||p.CloCodes||'');return `<tr>
      <td data-label="สัปดาห์"><strong>${esc(fmt(p.WeekNumber))}</strong><div class="row-no">รายการ ${i+1}</div></td>
      <td data-label="หัวข้อ / กิจกรรม"><strong>${esc(topic)}</strong>${p.LearningActivities&&p.LearningActivities!==topic?`<div class="subline">กิจกรรม: ${esc(p.LearningActivities)}</div>`:''}</td>
      <td data-label="วิธีสอน">${esc(fmt(method))}</td>
      <td data-label="CLO">${esc(fmt(mClo))}</td>
      <td data-label="ผู้สอน">${esc(fmt(normalizeText(notes)))}</td>
      <td data-label="ผลการสอน">${statusSelect(kind,i,r.Status)}</td>
      <td data-label="สาเหตุ">${resultColumn(kind,i,r,'Reason')}</td>
      <td data-label="การดำเนินการ">${resultColumn(kind,i,r,'Action')}</td></tr>`}).join('')}
      </tbody></table></div>`:`<div class="empty-table">ไม่มีแผนการสอนในส่วนนี้</div>`}</section>`;
  }
  function renderAssessments(){const items=readSource().Assessments;const rows=report.AssessmentResults;
    return `<section class="panel"><div class="panel-head"><div><h3>รายการวัดและประเมินผล</h3><p>แสดงคอลัมน์ประเมินจาก Syllabus พร้อมคอลัมน์ผลการบรรลุ สาเหตุ และการดำเนินการ</p></div><span class="pill">${rows.filter(r=>!!r.Status).length}/${rows.length} ระบุผลแล้ว</span></div>
    ${items.length?`<div class="table-scroller"><table class="data-table responsive-table assessment-table"><thead><tr><th>#</th><th>รายการประเมิน</th><th>ประเภทประเมิน</th><th>น้ำหนัก %</th><th>CLO</th><th>ผลการประเมิน</th><th>สาเหตุ</th><th>การดำเนินการ</th></tr></thead><tbody>${items.map((a,i)=>{
      const r=rows[i];const reserved=new Set(['AssessmentName','AssessmentType','WeightPercent','MappedCloCodes']);
      const misc=Object.entries(a).filter(([k,v])=>!reserved.has(k)&&v!==''&&v!=null).map(([k,v])=>`${fieldLabels[k]||k}: ${normalizeText(v)}`);
      return `<tr><td data-label="ลำดับ"><strong>${i+1}</strong></td>
        <td data-label="รายการประเมิน"><strong>${esc(fmt(a.AssessmentName))}</strong>${misc.map(x=>`<div class="subline">${esc(x)}</div>`).join('')}</td>
        <td data-label="ประเภท">${esc(fmt(a.AssessmentType))}</td>
        <td data-label="น้ำหนัก %">${esc(fmt(a.WeightPercent))}</td>
        <td data-label="CLO">${esc(fmt(a.MappedCloCodes))}</td>
        <td data-label="ผลการประเมิน">${statusSelect('assessment',i,r.Status)}</td>
        <td data-label="สาเหตุ">${resultColumn('assessment',i,r,'Reason')}</td>
        <td data-label="การดำเนินการ">${resultColumn('assessment',i,r,'Action')}</td></tr>`;
    }).join('')}</tbody></table></div>`:`<div class="empty-table">ไม่มีรายการประเมินใน Syllabus JSON</div>`}</section>`;}
  function renderBody(){switch(activeTab){case'course':return renderCourse();case'instructors':return renderInstructors();case'plans':return renderPlan();case'assessments':return renderAssessments();default:return '';}}
  function renderEmpty(){return `<div class="blank-state"><div class="blank-icon" aria-hidden="true">📋</div><div class="kicker">SYLLABUS IMPLEMENTATION REPORT</div><h2>รายงานการดำเนินงานตาม Syllabus</h2><p>นำเข้าไฟล์ Syllabus JSON เพื่อแสดงข้อมูลรายวิชา ผู้สอน แผนการสอน และการประเมิน จากนั้นกรอกผลการดำเนินงานจริงและบันทึกเป็นไฟล์รายงาน JSON แยกต่างหาก</p>
  <div class="blank-actions"><button class="btn btn-primary" type="button" data-action="open-syllabus">＋ นำเข้า Syllabus JSON</button><button class="btn" type="button" data-action="open-report">📂 เปิดรายงาน JSON เดิม</button></div>
  <div class="steps"><span>1. นำเข้า Syllabus</span><span>2. ระบุผลแต่ละรายการ</span><span>3. บันทึกรายงาน JSON</span></div>
  <p class="help-line">ระบบทำงานใน Browser • ไม่มีการส่งไฟล์ไปยัง Server • รองรับ Syllabus SchemaVersion 1.x</p></div>`;}
  function render(){const s=stats();const sec=sectionInfo[activeTab];
    app.innerHTML=`<div class="app-shell">
      <div class="menu-backdrop ${mobileOpen?'on':''}" data-action="close-menu"></div>
      <aside class="sidebar ${mobileOpen?'open':''}" id="sidebar"><div class="logo"><div class="logo-mark">Σ</div><div><b>SYLLABUS REPORT</b><span>IMPLEMENTATION • WEB v${APP_VERSION}</span></div></div>
      <div class="nav-label">WORKSPACE</div><nav class="nav" aria-label="เมนูรายงาน">${renderNav()}</nav>
      <div class="sidebar-foot">คณะวิทยาศาสตร์<br>มหาวิทยาลัยพะเยา<br>รายงานแยกจาก Syllabus ต้นฉบับ</div></aside>
      <main class="main"><header class="masthead"><div><div class="kicker">ACADEMIC TOOLS / IMPLEMENTATION</div><h1>รายงานการดำเนินงานตาม Syllabus</h1><p class="subtitle">Syllabus Implementation Report • ประมวลผลใน Browser ไม่ใช้ Backend</p></div>
      <div class="mast-actions"><button class="btn mobile-toggle" type="button" data-action="toggle-menu" aria-controls="sidebar" aria-expanded="${mobileOpen}">☰ หมวดข้อมูล</button><button class="btn" type="button" data-action="open-syllabus">＋ นำเข้า Syllabus</button><button class="btn" type="button" data-action="open-report">📂 เปิดรายงานเดิม</button></div></header>
      ${!report?renderEmpty():`
       <div class="hero"><div><small>รายวิชา • ${esc(normalizeText(readSource().CourseInfo.CourseCode||''))}</small><h2>${esc(getCourseName())}</h2><small>${esc(normalizeText(readSource().CourseInfo.CourseTitleEn||''))}</small></div><aside><small>OFFERING ID</small><strong>${esc(getOffering())}</strong><small>ข้อมูลต้นฉบับไม่ถูกแก้ไข</small></aside></div>
       ${renderCards()}
       <div class="section-head"><div><div class="kicker">SECTION ${tabs.findIndex(t=>t.id===activeTab)+1} / 4</div><h2>${esc(sec.title)}</h2><p>${esc(sec.subtitle)}</p></div><span class="pill">${esc(countPill())}</span></div>
       ${activeTab==='course'?`<div class="report-date"><div class="field"><label for="report-date">วันที่จัดทำรายงาน (เลือกได้)</label><input type="date" id="report-date" value="${esc(report.ReportDate)}"><span class="help-line">วันที่รายงานไม่แก้ไขวันที่ใน Syllabus ต้นฉบับ</span></div></div>`:''}
       ${activeTab==='plans'||activeTab==='assessments'?`<div class="status-note">เลือกระบุผลแต่ละรายการเป็น <strong>ตามแผน / ไม่ตามแผน</strong> หรือ <strong>บรรลุ / ไม่บรรลุ</strong> หากเลือกผลเป็นลบ ให้ระบุทั้ง “สาเหตุ” และ “การดำเนินการ” สามารถบันทึกรายงาน JSON ได้แม้ยังกรอกไม่ครบ</div>`:`<div class="status-note">ข้อมูลจาก Syllabus JSON แสดงแบบอ่านอย่างเดียว เพื่อรักษารายละเอียดต้นฉบับ</div>`}
       ${renderBody()}
       <div class="footer-note">รายงานนี้จัดเก็บแยกเป็น JSON • ไม่บันทึกอัตโนมัติ • กรุณาตรวจสอบไฟล์ที่ดาวน์โหลดก่อนปิดเว็บไซต์</div>
       <div class="sticky-save"><div class="sticky-inner"><p><strong>บันทึกรายงาน JSON หรือสร้างเอกสาร Word</strong><span id="save-indicator">${unsaved?'มีข้อมูลเปลี่ยนแปลงที่ยังไม่ได้บันทึก JSON':'สามารถแก้ไขและบันทึก JSON ได้ตลอดเวลา'}</span></p><div class="footer-actions"><button type="button" class="btn btn-primary" data-action="save-report">⇩ บันทึกรายงาน JSON</button><button type="button" class="btn btn-docx" data-action="export-docx">▤ สร้าง DOCX</button></div></div></div>`}
      </main></div>`;
    updateMetrics();
  }
  function updateMetrics(){const s=stats();document.querySelectorAll('[data-metric]').forEach(el=>{const k=el.dataset.metric;el.textContent=k==='incomplete'?(s.incomplete?`กรอกสาเหตุ/การดำเนินการไม่ครบ ${s.incomplete} รายการ`:'สาเหตุ/การดำเนินการครบตามที่ระบุ'):s[k]});document.querySelectorAll('[data-progress]').forEach(el=>{el.style.width=(s.total?s.done/s.total*100:0)+'%'})}
  function getRows(kind){return kind==='assessment'?report.AssessmentResults:kind==='lab'?report.LabResults:report.LectureResults;}
  function changeStatus(kind,index,next,select){
    const row=getRows(kind)[index];if(!row)return;
    if(row.Status!==next && (row.Reason.trim()||row.Action.trim())&&next!==row.Status){
      if(!window.confirm('การเปลี่ยนสถานะจะล้างข้อมูลสาเหตุและการดำเนินการเดิมของรายการนี้ ต้องการดำเนินการต่อหรือไม่?')){select.value=row.Status;return;}
      row.Reason='';row.Action='';
    }
    row.Status=next;markUnsaved();render();
    // Move the focus back to the changed result field after re-render.
    const s=document.querySelector(`.status-select[data-kind="${kind}"][data-index="${index}"]`);s?.focus();
  }
  function setText(kind,index,field,value) {const row=getRows(kind)[index];if(row){row[field]=value;markUnsaved();updateMetrics();}}
  function startSyllabus(data,filename){validSyllabus(data);if(report&&!window.confirm('นำเข้า Syllabus ใหม่จะเปลี่ยนงานรายงานที่กำลังเปิดอยู่ กรุณาบันทึกรายงาน JSON ก่อนหากต้องการเก็บข้อมูลเดิม ต้องการดำเนินการต่อหรือไม่?'))return;
    report=makeReport(data,filename);activeTab='course';planTab='lecture';unsaved=true;mobileOpen=false;render();showToast('นำเข้า Syllabus สำเร็จ พร้อมบันทึกผลการดำเนินงาน');}
  function startReport(data){const r=normalizeReport(data);if(report&&!window.confirm('เปิดไฟล์รายงานใหม่แทนงานที่กำลังเปิดอยู่หรือไม่? กรุณาบันทึกงานที่ยังไม่ได้บันทึกก่อน'))return;
    report=r;activeTab='course';planTab='lecture';unsaved=false;mobileOpen=false;render();showToast('เปิดรายงานเดิมเรียบร้อยแล้ว');}
  function downloadReport(){if(!report)return;report.UpdatedAt=timeISO();const data=JSON.stringify(report,null,2);const blob=new Blob([data],{type:'application/json;charset=utf-8'});const url=URL.createObjectURL(blob);
    const c=readSource().CourseInfo||{};const name=`SYLLABUS_REPORT_${fileSafe(c.CourseCode)}_${fileSafe(c.AcademicYear)}_${fileSafe(c.Semester)}_${fileSafe(c.Section||'01')}.json`;
    const anchor=document.createElement('a');anchor.href=url;anchor.download=name;document.body.appendChild(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1200);
    unsaved=false;const e=document.getElementById('save-indicator');if(e)e.textContent='เริ่มดาวน์โหลดแล้ว • กรุณาตรวจสอบไฟล์ใน Downloads';
    const s=stats();showToast(s.incomplete?`เริ่มดาวน์โหลด JSON แล้ว • มี ${s.incomplete} รายการที่ยังไม่กรอกสาเหตุ/การดำเนินการครบ`:'เริ่มดาวน์โหลดรายงาน JSON แล้ว กรุณาตรวจสอบไฟล์');
  }
  function downloadDocx(){
    if(!report)return;
    try {
      if(!window.SyllabusReportDocx)throw new Error('ไม่พบชุดคำสั่งสร้างเอกสาร Word');
      const blob=window.SyllabusReportDocx.makeDocx(report);
      const c=readSource().CourseInfo||{};
      const name=`SYLLABUS_REPORT_${fileSafe(c.CourseCode)}_${fileSafe(c.AcademicYear)}_${fileSafe(c.Semester)}_${fileSafe(c.Section||'01')}.docx`;
      const url=URL.createObjectURL(blob);const a=document.createElement('a');
      a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),3000);
      const st=stats();
      showToast(st.missing||st.incomplete ? `เริ่มดาวน์โหลด DOCX แล้ว • รายงานยังมี ${st.missing} รายการที่ไม่ระบุผล และ ${st.incomplete} รายการที่ต้องกรอกสาเหตุ/การดำเนินการ` : 'เริ่มดาวน์โหลด DOCX แล้ว กรุณาตรวจสอบไฟล์ใน Downloads');
      // DOCX export never marks the Report JSON as saved and never modifies report data.
    } catch(err){showToast('สร้าง DOCX ไม่สำเร็จ: '+(err?.message||err),true);}
  }
  async function loadFile(event,mode){const file=event.target.files?.[0];if(!file)return;event.target.value='';
    try{if(file.size>15*1024*1024)throw new Error('ไฟล์มีขนาดเกิน 15 MB');const text=await file.text();const data=JSON.parse(text.replace(/^\uFEFF/,''));mode==='syllabus'?startSyllabus(data,file.name):startReport(data);}
    catch(err){showToast('เปิดไฟล์ไม่สำเร็จ: '+err.message,true);}
  }
  // All interaction is delegated to the root, so responsive re-renders do not duplicate event listeners.
  app.addEventListener('click',event=>{
    const b=event.target.closest('[data-tab],[data-plan-tab],[data-action]');if(!b)return;
    if(b.dataset.tab){if(!report){showToast('กรุณานำเข้า Syllabus JSON ก่อน');return;}activeTab=b.dataset.tab;mobileOpen=false;render();window.scrollTo(0,0);return;}
    if(b.dataset.planTab){planTab=b.dataset.planTab;render();return;}
    const action=b.dataset.action;
    if(action==='open-syllabus')document.getElementById('syllabus-file').click();
    else if(action==='open-report')document.getElementById('report-file').click();
    else if(action==='save-report')downloadReport();
    else if(action==='export-docx')downloadDocx();
    else if(action==='toggle-menu'){mobileOpen=!mobileOpen;render();}
    else if(action==='close-menu'){mobileOpen=false;render();}
  });
  app.addEventListener('change',event=>{
    const t=event.target;
    if(t.matches('.status-select'))changeStatus(t.dataset.kind,Number(t.dataset.index),t.value,t);
    else if(t.id==='report-date'&&report){report.ReportDate=t.value;markUnsaved();}
  });
  app.addEventListener('input',event=>{
    const t=event.target;
    if(t.matches('textarea.form-control')){
      setText(t.dataset.kind,Number(t.dataset.index),t.dataset.field,t.value);
      t.classList.toggle('invalid',!t.value.trim());const msg=t.parentElement.querySelector('.error-msg');if(msg)msg.style.display=t.value.trim()?'none':'';
    }
  });
  document.getElementById('syllabus-file').addEventListener('change',e=>loadFile(e,'syllabus'));
  document.getElementById('report-file').addEventListener('change',e=>loadFile(e,'report'));
  window.addEventListener('beforeunload',e=>{if(unsaved&&report){e.preventDefault();e.returnValue='';}});
  render();
  // Available only to automated local tests; never exported to production data.
  if(location.hostname==='localhost'||location.hostname==='127.0.0.1'){
    window.__syllabusReportTest={startSyllabus,startReport,getReport:()=>report,stats,changeTab:id=>{activeTab=id;render()},getState:()=>({activeTab,planTab,unsaved})};
  }
})();
