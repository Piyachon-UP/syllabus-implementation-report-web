/* Smart Syllabus Implementation Report: self-contained DOCX generator.
   Generates OOXML in Browser, with no CDN, backend, or dependency at runtime.
   Input Report JSON and SourceSyllabus are never modified. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.SyllabusReportDocx=api;
})(typeof window!=='undefined'?window:undefined,function(){
'use strict';
const encoder=new TextEncoder();
const TYPE='application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const W=15100;
const txt=x=>x==null?'':Array.isArray(x)?x.map(txt).filter(Boolean).join(', '):typeof x==='boolean'?(x?'ใช่':'ไม่ใช่'):typeof x==='object'?JSON.stringify(x):String(x);
const val=x=>txt(x).trim()||'—';
const xml=x=>txt(x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
const makeRun=x=>txt(x).replace(/\r\n/g,'\n').replace(/\r/g,'\n').split('\n').map((part,i)=>(i?'<w:br/>':'')+`<w:t xml:space="preserve">${xml(part)}</w:t>`).join('');
function para(x,style='Normal'){
  return `<w:p><w:pPr><w:pStyle w:val="${style}"/></w:pPr><w:r>${makeRun(x)}</w:r></w:p>`;
}
function cell(x,width,isHead=false,alt=false){
  const fill=isHead?'173C60':alt?'F3F7FA':'FFFFFF';
  return `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/><w:shd w:fill="${fill}"/><w:tcMar><w:top w:w="105" w:type="dxa"/><w:left w:w="105" w:type="dxa"/><w:bottom w:w="105" w:type="dxa"/><w:right w:w="105" w:type="dxa"/></w:tcMar></w:tcPr>${para(val(x),isHead?'TableHead':'TableBody')}</w:tc>`;
}
function table(headings,rows,widths){
  if(!rows.length)return para('ไม่มีข้อมูล','Muted');
  if(!widths){const n=Math.floor(W/headings.length);widths=headings.map((_,i)=>i===headings.length-1?W-n*(headings.length-1):n);}
  if(widths.reduce((a,b)=>a+b,0)!==W)throw new Error('ความกว้างตารางไม่ตรงกับพื้นที่เอกสาร');
  const row=(contents,head,i)=>{const long=contents.some(v=>txt(v).length>420);return `<w:tr><w:trPr>${head?'<w:tblHeader w:val="true"/>':(!long?'<w:cantSplit/>':'')}</w:trPr>${headings.map((_,j)=>cell(contents[j],widths[j],head,i%2===1)).join('')}</w:tr>`;};
  const borders=['top','left','bottom','right','insideH','insideV'].map(side=>`<w:${side} w:val="single" w:sz="5" w:color="D1DDE8"/>`).join('');
  return `<w:tbl><w:tblPr><w:tblW w:w="${W}" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders>${borders}</w:tblBorders><w:tblCellSpacing w:w="0" w:type="dxa"/></w:tblPr><w:tblGrid>${widths.map(w=>`<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>${row(headings,true,0)}${rows.map((r,i)=>row(r,false,i)).join('')}</w:tbl>`;
}
function dateTh(value){
  if(!value)return '—';
  const m=/^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));
  return m?`${Number(m[3])}/${Number(m[2])}/${Number(m[1])+543}`:txt(value);
}
const labels={
  CourseCode:'รหัสรายวิชา',CourseTitleTh:'ชื่อรายวิชาภาษาไทย',CourseTitleEn:'ชื่อรายวิชาภาษาอังกฤษ',CourseDescriptionTh:'คำอธิบายรายวิชาภาษาไทย',CourseDescriptionEn:'คำอธิบายรายวิชาภาษาอังกฤษ',
  Credits:'หน่วยกิต',LectureHours:'ชั่วโมงบรรยาย',LabHours:'ชั่วโมงปฏิบัติการ',SelfStudyHours:'ชั่วโมงศึกษาด้วยตนเอง',AcademicYear:'ปีการศึกษา (พ.ศ.)',Semester:'ภาคเรียน',Section:'กลุ่มเรียน',FacultyName:'คณะ',UniversityName:'มหาวิทยาลัย',LastUpdatedDate:'วันที่บันทึก/ปรับปรุง Syllabus',
  CurriculumCode:'รหัสหลักสูตร',CurriculumName:'ชื่อหลักสูตร',ProgramName:'สาขาวิชา',DegreeLevel:'ระดับปริญญา',DepartmentName:'หน่วยงาน',
  IsResponsibleInstructor:'ผู้รับผิดชอบรายวิชา',Prefix:'คำนำหน้า',FirstName:'ชื่อ',LastName:'นามสกุล',DisplayName:'ชื่อผู้สอน',Department:'สาขาวิชา',StaffId:'รหัสบุคลากร',StaffID:'รหัสบุคลากร',Email:'อีเมล',LecturePercent:'สัดส่วนบรรยาย (%)',LabPercent:'สัดส่วนปฏิบัติการ (%)'
};
function label(k){return labels[k]||k;}
const isObj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
function rowsFromObj(o){return Object.entries(isObj(o)?o:{}).map(([k,v])=>[label(k),k==='LastUpdatedDate'?dateTh(v):val(v)]);}
function statusText(x){return txt(x.Status).trim()||'ยังไม่ระบุ';}
function detailText(x,key){if(x.Status==='ไม่ตามแผน'||x.Status==='ไม่บรรลุ')return val(x[key]);return '—';}
function summary(data){
  const all=[...(data.LectureResults||[]),...(data.LabResults||[]),...(data.AssessmentResults||[])];
  const done=all.filter(x=>x.Status).length;
  const neg=all.filter(x=>x.Status==='ไม่ตามแผน'||x.Status==='ไม่บรรลุ').length;
  const incomplete=all.filter(x=>(x.Status==='ไม่ตามแผน'||x.Status==='ไม่บรรลุ')&&(!txt(x.Reason).trim()||!txt(x.Action).trim())).length;
  return {total:all.length,done,neg,missing:all.length-done,incomplete};
}
function validate(data){
  if(!isObj(data)||data.ReportType!=='SyllabusImplementation'||!isObj(data.SourceSyllabus))throw new Error('ไม่มีข้อมูลรายงานการดำเนินงานตาม Syllabus');
  const s=data.SourceSyllabus;
  for(const k of ['LecturePlans','LabPlans','Assessments'])if(!Array.isArray(s[k])||!Array.isArray(data[k==='LecturePlans'?'LectureResults':k==='LabPlans'?'LabResults':'AssessmentResults']))throw new Error('ข้อมูลรายงานไม่ครบ: '+k);
  return data;
}
function documentXML(data){
  data=validate(data);
  const syllabus=data.SourceSyllabus, ci=syllabus.CourseInfo||{},curr=syllabus.Curriculum||{};
  const c=summary(data);const b=[];
  b.push(para('รายงานผลการดำเนินงานตาม Syllabus','Title'));
  b.push(para('Syllabus Implementation Report','Subtitle'));
  b.push(para('คณะวิทยาศาสตร์ มหาวิทยาลัยพะเยา','Center'));
  b.push(para(`${val(ci.CourseCode)}  ${val(ci.CourseTitleTh)}`,'CourseTitle'));
  if(ci.CourseTitleEn)b.push(para(ci.CourseTitleEn,'Center'));
  b.push(para(`ปีการศึกษา ${val(ci.AcademicYear)}  ภาคเรียน ${val(ci.Semester)}  กลุ่มเรียน ${val(ci.Section)}     วันที่รายงาน ${dateTh(data.ReportDate)}`,'Center'));
  b.push(para('สรุปผลการรายงาน','Heading1'));
  b.push(table(['รายการ','จำนวน'],[['รายการติดตามทั้งหมด',c.total],['ระบุผลแล้ว',c.done],['ไม่ตามแผน / ไม่บรรลุ',c.neg],['ยังไม่ระบุผล',c.missing],['รายการผลเป็นลบที่ยังกรอกสาเหตุ/การดำเนินการไม่ครบ',c.incomplete]],[11800,3300]));
  if(c.missing||c.incomplete)b.push(para('หมายเหตุ: เอกสารฉบับนี้มีรายการที่ยังไม่รายงานผล หรือข้อมูลสาเหตุ/การดำเนินการยังไม่ครบ','Warning'));
  b.push(para('1. ข้อมูลรายวิชา','Heading1'));
  b.push(table(['รายการ','ข้อมูลจาก Syllabus'],rowsFromObj(ci),[4100,11000]));
  b.push(para('2. ข้อมูลหลักสูตร','Heading1'));
  b.push(table(['รายการ','ข้อมูลจาก Syllabus'],rowsFromObj(curr),[4100,11000]));
  b.push(para('3. ผู้รับผิดชอบรายวิชาและผู้สอน','Heading1'));
  const teachers=syllabus.Instructors||[];
  const teacherRows=teachers.flatMap((teacher,i)=>{
    const fields=rowsFromObj(teacher);
    return fields.map(([k,v],j)=>[j===0?i+1:'',k,v]);
  });
  b.push(table(['ลำดับ','รายการ','รายละเอียด'],teacherRows,[1000,3700,10400]));
  const plans=(title,source,results)=>{
    b.push(para(title,'Heading1'));
    const rows=source.map((p,i)=>{
      const r=results.find(x=>x.SourceIndex===i)||{};
      const topic=[p.Topic,p.LearningActivities&&p.LearningActivities!==p.Topic?'กิจกรรม: '+p.LearningActivities:''].filter(Boolean).join('\n');
      return [val(p.WeekNumber),val(topic),val(p.TeachingMethods||p.TeachingMethod),val(p.MappedCloCodes||p.CloCodes),val(p.Notes||p.InstructorNames),statusText(r),detailText(r,'Reason'),detailText(r,'Action')];
    });
    b.push(table(['สัปดาห์','หัวข้อ / กิจกรรม','วิธีสอน','CLO','ผู้สอน','ผลการสอน','สาเหตุ','การดำเนินการ'],rows,[1010,2890,1610,890,1960,1420,2660,2660]));
  };
  plans('4. ผลการจัดการเรียนการสอนภาคบรรยาย (Lecture)',syllabus.LecturePlans,data.LectureResults);
  plans('5. ผลการจัดการเรียนการสอนภาคปฏิบัติการ (Lab)',syllabus.LabPlans,data.LabResults);
  b.push(para('6. ผลการวัดและประเมินผล','Heading1'));
  const aRows=syllabus.Assessments.map((a,i)=>{
    const r=data.AssessmentResults.find(x=>x.SourceIndex===i)||{};
    return [val(i+1),val(a.AssessmentName),val(a.AssessmentType),val(a.WeightPercent),val(a.MappedCloCodes),statusText(r),detailText(r,'Reason'),detailText(r,'Action')];
  });
  b.push(table(['ลำดับ','รายการประเมิน','ประเภท','น้ำหนัก %','CLO','ผลการประเมิน','สาเหตุ','การดำเนินการ'],aRows,[670,2870,1810,880,1000,1400,3235,3235]));
  b.push(para('ข้อมูลประกอบการรายงาน','Heading1'));
  b.push(table(['รายการ','รายละเอียด'],[
    ['Offering ID',val(data.SourceOfferingId||syllabus.OfferingId)],
    ['ไฟล์ Syllabus ต้นฉบับ',val(data.SourceFileName)],
    ['วันที่จัดทำรายงาน',dateTh(data.ReportDate)],
    ['หมายเหตุ','ข้อมูลรายวิชา ผู้สอน และแผนการสอนมาจาก Syllabus JSON ต้นฉบับ ส่วนผลการดำเนินงานมาจากไฟล์รายงาน JSON']
  ],[4100,11000]));
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${b.join('')}<w:sectPr><w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/><w:pgMar w:top="850" w:right="850" w:bottom="850" w:left="850" w:header="400" w:footer="400" w:gutter="0"/></w:sectPr></w:body></w:document>`;
}
function stylesXML(){
 const space=(before,after)=>`<w:spacing w:before="${before}" w:after="${after}" w:line="290" w:lineRule="auto"/>`;
 const style=(id,name,size,attrs='',bold=false,color='18344D')=>`<w:style w:type="paragraph" w:styleId="${id}"><w:name w:val="${name}"/><w:basedOn w:val="Normal"/><w:pPr>${attrs}</w:pPr><w:rPr><w:rFonts w:ascii="TH Sarabun New" w:hAnsi="TH Sarabun New" w:eastAsia="TH Sarabun New" w:cs="TH Sarabun New"/><w:sz w:val="${size}"/><w:szCs w:val="${size}"/><w:color w:val="${color}"/>${bold?'<w:b/>':''}</w:rPr></w:style>`;
 return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="TH Sarabun New" w:hAnsi="TH Sarabun New" w:eastAsia="TH Sarabun New" w:cs="TH Sarabun New"/><w:sz w:val="28"/><w:szCs w:val="28"/><w:lang w:val="th-TH" w:eastAsia="th-TH"/></w:rPr></w:rPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:pPr>${space(0,85)}</w:pPr></w:style>${style('Title','Title',43,`<w:jc w:val="center"/>${space(120,60)}`,true,'173C60')}${style('Subtitle','Subtitle',29,`<w:jc w:val="center"/>${space(0,65)}`,false)}${style('Center','Centered',28,`<w:jc w:val="center"/>${space(0,80)}`)}${style('CourseTitle','CourseTitle',34,`<w:jc w:val="center"/>${space(60,75)}`,true)}${style('Heading1','Heading1',31,`<w:keepNext/>${space(190,100)}`,true,'007C83')}${style('TableHead','TableHead',23,space(0,0),true,'FFFFFF')}${style('TableBody','TableBody',23,space(0,0))}${style('Warning','Warning',25,space(85,90),true,'AD4A2A')}${style('Muted','Muted',25,space(60,85),false,'64748B')}</w:styles>`;
}
function crc32(bytes){let crc=0xFFFFFFFF;for(let i=0;i<bytes.length;i++){crc^=bytes[i];for(let j=0;j<8;j++)crc=(crc&1)?(0xEDB88320^(crc>>>1)):(crc>>>1);}return (crc^0xFFFFFFFF)>>>0;}
function little16(v){return [v&255,(v>>>8)&255];}
function little32(v){return [v&255,(v>>>8)&255,(v>>>16)&255,(v>>>24)&255];}
function zipFiles(files){
 const local=[],central=[];let offset=0,count=0;
 for(const [name,content] of Object.entries(files)){
  const n=encoder.encode(name),d=encoder.encode(content),c=crc32(d),sz=d.length;
  const l=new Uint8Array([0x50,0x4b,3,4,...little16(20),...little16(0x0800),...little16(0),...little16(0),...little16(0),...little32(c),...little32(sz),...little32(sz),...little16(n.length),...little16(0)]);
  local.push(l,n,d);
  central.push(new Uint8Array([0x50,0x4b,1,2,...little16(20),...little16(20),...little16(0x0800),...little16(0),...little16(0),...little16(0),...little32(c),...little32(sz),...little32(sz),...little16(n.length),...little16(0),...little16(0),...little16(0),...little16(0),...little32(0),...little32(offset)]),n);
  offset+=l.length+n.length+d.length;count++;
 }
 const clen=central.reduce((n,x)=>n+x.length,0);
 const end=new Uint8Array([0x50,0x4b,5,6,...little16(0),...little16(0),...little16(count),...little16(count),...little32(clen),...little32(offset),...little16(0)]);
 return new Blob([...local,...central,end],{type:TYPE});
}
function makeDocx(data){
 const files={
  '[Content_Types].xml':`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`,
  '_rels/.rels':`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`,
  'word/document.xml':documentXML(data),
  'word/styles.xml':stylesXML(),
  'word/_rels/document.xml.rels':`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
  'docProps/core.xml':`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>รายงานผลการดำเนินงานตาม Syllabus</dc:title><dc:creator>Smart Syllabus Implementation Report</dc:creator></cp:coreProperties>`,
  'docProps/app.xml':`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Smart Syllabus Implementation Report Web</Application></Properties>`
 };
 return zipFiles(files);
}
return {makeDocx,documentXML,summary,TYPE};
});
