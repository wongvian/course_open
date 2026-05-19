const API_BASE = 'https://admission.snru.ac.th';

// Global variables for export functionality
let currentCourseDetail = null;
let currentStudentData = [];
let currentCourseParams = {};

/* ================================
   Utility Functions
================================ */

// แปลงรหัสประเภทนักศึกษาเป็นชื่อภาษาไทย
function getStudentTypeDisplayName(stdtype) {
    const typeMap = {
        '1': 'ป.ตรี ภาคปกติ',
        '2': 'ป.ตรี ภาคพิเศษ',
        '3': 'ป.โท',
        '4': 'ป.เอก'
    };
    return typeMap[String(stdtype)] ?? `ประเภท ${stdtype}`;
}

// แสดง/ซ่อนสถานะ
function setVisibility({ loading = false, details = false, error = false }) {
    document.getElementById('loading').classList.toggle('d-none', !loading);
    document.getElementById('courseDetails').classList.toggle('d-none', !details);
    document.getElementById('errorState').classList.toggle('d-none', !error);
}

// แสดงข้อความผิดพลาด
function showError(message) {
    document.getElementById('errorMessage').textContent = message;
    setVisibility({ error: true });
}

/* ================================
   Rendering Functions
================================ */

// สร้างตารางรายชื่อนักศึกษา
function createStudentTable(students = []) {
    if (students.length === 0) {
        return `
            <div class="alert alert-info">
                <i class="bi bi-info-circle"></i> ไม่มีข้อมูลนักศึกษาที่จองในรายวิชานี้
            </div>`;
    }

    const rows = students.map((s, i) => {
        const id = s.STUDENT_ID ?? s.STD_ID ?? 'ไม่ระบุ';
        const name = s.STD_NAME ?? s.STUDENT_NAME ?? 'ไม่ระบุชื่อ';
        const program = s.PROGRAM_NAME_TH+'-'+s.LEV_SHORT ?? s.MAJOR_NAME ?? 'ไม่ระบุ';
        return `
            <tr>
                <td>${i + 1}</td>
                <td><span class="badge bg-secondary">${id}</span></td>
                <td>${name}</td>
                <td>${program}</td>
            </tr>`;
    }).join('');

    return `
        <div class="table-responsive">
            <table class="table table-striped table-hover">
                <thead class="table-dark">
                    <tr>
                        <th>#</th>
                        <th>รหัสนักศึกษา</th>
                        <th>ชื่อ-นามสกุล</th>
                         <th>สาขาวิชา</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>`;
}

// แสดงข้อมูลรายวิชาเพิ่มเติม
function renderCourseInfo(course) {
    document.getElementById('courseInfo').innerHTML = `
        <div class="col-md-6">
            <p><strong>ผู้สอน1:</strong> ${course?.FULL_NAME_PK1 ?? 'ไม่ระบุ'}</p>
            <p><strong>ผู้สอน2:</strong> ${course?.FULL_NAME_PK2 ?? '-'}</p>
            <p><strong>ผู้สอน3:</strong> ${course?.FULL_NAME_PK3 ?? '-'}</p>
            <p><strong>ผู้สอน4:</strong> ${course?.FULL_NAME_PK4 ?? '-'}</p>
            <p><strong>ผู้สอน5:</strong> ${course?.FULL_NAME_PK5 ?? '-'}</p>

            <p><strong>จำนวนหน่วยกิต:</strong> ${course?.CREDIT ?? 'ไม่ระบุ'} หน่วยกิต</p>
        </div>
        <div class="col-md-6">
            <p><strong>วัน-เวลา:</strong> ${course?.TIME_T ?? 'ไม่ระบุ'}</p>
            <p><strong>ห้องเรียน:</strong> ${course?.ROOM1 ?? 'ไม่ระบุ'}</p>
        </div>`;
}

/* ================================
   Excel Export Functions
================================ */

// สร้างชื่อไฟล์สำหรับ Excel
function generateExcelFilename() {
    const date = new Date();
    const dateStr = date.toLocaleDateString('th-TH', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
    }).replace(/\//g, '-');
    
    const courseName = currentCourseDetail?.NAME_T || 'รายวิชา';
    const courseId = currentCourseParams.courseid || '';
    const section = currentCourseParams.section || '';
    const term = currentCourseParams.term || '';
    
    return `รายชื่อนักศึกษา_${courseId}_กลุ่ม${section}_${term}_${dateStr}.xlsx`;
}

// ส่งออกข้อมูลเป็น Excel
function exportToExcel() {
    try {
        if (!currentStudentData || currentStudentData.length === 0) {
            alert('ไม่มีข้อมูลนักศึกษาสำหรับส่งออก');
            return;
        }

        // สร้างข้อมูลสำหรับ Excel
        const exportData = [];
        
        // ข้อมูลหัวข้อรายวิชา
        exportData.push([
            'ข้อมูลรายวิชา',
            currentCourseDetail?.NAME_T || '',
            '',
            ''
        ]);
        exportData.push([
            'รหัสวิชา',
            currentCourseParams.courseid || '',
            'กลุ่ม',
            currentCourseParams.section || ''
        ]);
        exportData.push([
            'ภาคการศึกษา',
            currentCourseParams.term || '',
            'ประเภทนักศึกษา',
            getStudentTypeDisplayName(currentCourseParams.stdtype)
        ]);
        exportData.push([
            'ผู้สอน',
            currentCourseDetail?.TNAME || 'ไม่ระบุ',
            'หน่วยกิต',
            currentCourseDetail?.CREDIT || 'ไม่ระบุ'
        ]);
        exportData.push([
            'วัน-เวลา',
            currentCourseDetail?.TIME_T || 'ไม่ระบุ',
            'ห้องเรียน',
            currentCourseDetail?.ROOM1 || 'ไม่ระบุ'
        ]);
        
        // เว้นบรรทัด
        exportData.push(['']);
        
        // หัวข้อตารางนักศึกษา
        exportData.push(['ลำดับ', 'รหัสนักศึกษา', 'ชื่อ-นามสกุล']);
        
        // ข้อมูลนักศึกษา
        currentStudentData.forEach((student, index) => {
            const id = student.STUDENT_ID ?? student.STD_ID ?? 'ไม่ระบุ';
            const name = student.STD_NAME ?? student.STUDENT_NAME ?? 'ไม่ระบุชื่อ';
            const program = student.PROGRAM_NAME_TH  ?? 'ไม่ระบุชื่อ';
            exportData.push([index + 1, id, name]);
        });
        
        // สร้าง workbook และ worksheet
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(exportData);
        
        // กำหนดความกว้างของคอลัมน์
        const colWidths = [
            { wch: 8 },   // ลำดับ
            { wch: 15 },  // รหัสนักศึกษา
            { wch: 30 },  // ชื่อ-นามสกุล
            { wch: 15 }   // คอลัมน์เพิ่มเติม
        ];
        ws['!cols'] = colWidths;
        
        // เพิ่ม worksheet เข้า workbook
        XLSX.utils.book_append_sheet(wb, ws, 'รายชื่อนักศึกษา');
        
        // สร้างชื่อไฟล์และดาวน์โหลด
        const filename = generateExcelFilename();
        XLSX.writeFile(wb, filename);
        
        console.log('Excel file exported successfully:', filename);
        
    } catch (error) {
        console.error('Error exporting to Excel:', error);
        alert('เกิดข้อผิดพลาดในการส่งออกไฟล์ Excel');
    }
}

/* ================================
   Data Fetching
================================ */

// async function fetchCourseDetails(courseid, section, term, stdtype) {
async function fetchCourseDetails(courseid, section, term, stdtype) {
    const url = `${API_BASE}/course_detail/${courseid}/${section}/${encodeURIComponent(term)}/${stdtype}`;
    console.log("Fetching course details:", url);

    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    if (!data || (Array.isArray(data) && data.length === 0)) {
        throw new Error("ไม่พบข้อมูลรายวิชานี้");
    }

    return Array.isArray(data) ? data[0] : data;
}

// ดึงข้อมูลนักศึกษาที่ลงทะเบียน
async function fetchStudentData(courseid, section, term, stdtype) {
    const url = `${API_BASE}/std_in_course/${courseid}/${section}/${encodeURIComponent(term)}/${stdtype}`;
    console.log("Fetching student data:", url);

    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    return Array.isArray(data) ? data : [data];
}

/* ================================
   Main Function
================================ */

async function loadCourseDetails(courseid, section, term, stdtype) {
    try {
        setVisibility({ loading: true });
        
        // ซ่อนปุ่ม Export
        document.getElementById('exportExcelBtn').style.display = 'none';

        // ดึงข้อมูลรายวิชาและข้อมูลนักศึกษาแยกกัน
        const [courseDetail, studentData] = await Promise.all([
            fetchCourseDetails(courseid, section, term, stdtype),
            fetchStudentData(courseid, section, term, stdtype)
        ]);
        
        // เก็บข้อมูลไว้ในตัวแปร global สำหรับการ export
        currentCourseDetail = courseDetail;
        currentStudentData = studentData;
        currentCourseParams = { courseid, section, term, stdtype };

        // Header รายวิชา - ใช้ข้อมูลจาก course_detail
        document.getElementById('courseName').textContent = courseDetail?.NAME_T ?? `รายวิชา ${courseid}`;
        document.getElementById('courseId').textContent = courseid;
        document.getElementById('section').textContent = section;
        document.getElementById('termDisplay').textContent = term;
        document.getElementById('stdTypeDisplay').textContent = getStudentTypeDisplayName(stdtype);

        // รายละเอียดรายวิชา - ใช้ข้อมูลจาก course_detail
        renderCourseInfo(courseDetail);

        // จำนวนนักศึกษา - ใช้ข้อมูลจาก std_in_course
        document.getElementById('studentCount').textContent = `${studentData.length} คน`;

        // ตารางนักศึกษา - ใช้ข้อมูลจาก std_in_course
        document.getElementById('studentList').innerHTML = createStudentTable(studentData);
        
        // แสดงปุ่ม Export หากมีข้อมูลนักศึกษา
        if (studentData && studentData.length > 0) {
            document.getElementById('exportExcelBtn').style.display = 'block';
        }

        setVisibility({ details: true });

    } catch (error) {
        console.error('เกิดข้อผิดพลาด:', error);

        let msg = 'ไม่สามารถโหลดข้อมูลรายวิชาได้';
        if (/Failed to fetch|NetworkError/.test(error.message)) {
            msg = 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ โปรดตรวจสอบการเชื่อมต่ออินเทอร์เน็ต';
        } else if (error.message) {
            msg = error.message;
        }

        showError(msg);
    }
}

/* ================================
   Bootstrap
================================ */

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const courseid = params.get('courseid');
    const section  = params.get('section');
    const term     = params.get('term');
    const stdtype  = params.get('stdtype');

    console.log('URL Parameters:', { courseid, section, term, stdtype });

    if (!courseid || !section || !term || !stdtype) {
        showError('ข้อมูลไม่ครบถ้วน โปรดลองค้นหารายวิชาใหม่อีกครั้ง');
        return;
    }

    // ปุ่มลองใหม่
    document.getElementById('retryBtn').addEventListener('click', () => {
        loadCourseDetails(courseid, section, term, stdtype);
    });
    
    // ปุ่มส่งออก Excel
    document.getElementById('exportExcelBtn').addEventListener('click', () => {
        exportToExcel();
    });

    // โหลดข้อมูลครั้งแรก
    loadCourseDetails(courseid, section, term, stdtype);
});
