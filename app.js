// Base URL ของ API (อาจจะดึงมาจาก config หรือ hardcode)
const API_BASE = 'https://apiapp.snru.ac.th';

// ฟังก์ชันสำหรับแปลงรหัสประเภทนักศึกษาเป็นชื่อภาษาไทย
function getStudentTypeDisplayName(stdtype) {
    const typeMap = {
        '1': 'ป.ตรี ภาคปกติ',
        '2': 'ป.ตรี ภาคพิเศษ',
        '3': 'ป.โท ภาคปกติ',
        '4': 'ป.โท ภาคพิเศษ',
        1: 'ป.ตรี ภาคปกติ',
        2: 'ป.ตรี ภาคพิเศษ',
        3: 'ป.โท ภาคปกติ',
        4: 'ป.โท ภาคพิเศษ'
        

    };
    return typeMap[stdtype] || 'ไม่ระบุ';
}

// ฟังก์ชันสำหรับสร้างชื่อไฟล์ Excel
function generateExcelFilename(searchParams) {
    const term = searchParams.term || 'unknown';
    const stdtypeDisplay = getStudentTypeDisplayName(searchParams.stdtype);
    const currentDate = new Date().toLocaleDateString('th-TH').replace(/\//g, '-');
    return `รายวิชา_${term}_${stdtypeDisplay}_${currentDate}.xlsx`;
}

// ฟังก์ชันสำหรับ Export ข้อมูลเป็น Excel
function exportToExcel(data, searchParams) {
    if (!data || data.length === 0) {
        alert('ไม่มีข้อมูลสำหรับ Export');
        return;
    }

    try {
        // สร้างข้อมูลสำหรับ Excel (ไม่รวมคอลัมน์ Action)
        const excelData = data.map(course => ({
            'รหัสวิชา': course.COURSE_ID,
            'ชื่อวิชา': course.NAME_T,
            'กลุ่ม': course.SECTION,
            'ผู้สอน': course.TNAME || 'N/A',
            'วัน-เวลา': course.TIME_T,
            'ห้อง': course.ROOM1,
            'กลุ่มวิชา': course.VARNAM,
            'จำนวนเปิดรับ': course.STD_NUM,
            'จำนวนที่จอง': course.NUM_RESERV,
            'เทอม': course.TERM,
        }));

        // สร้าง workbook และ worksheet
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(excelData);

        // ตั้งค่าความกว้างของคอลัมน์
        const colWidths = [
            { wch: 12 }, // รหัสวิชา
            { wch: 40 }, // ชื่อวิชา
            { wch: 8 },  // กลุ่ม
            { wch: 25 }, // ผู้สอน
            { wch: 20 }, // วัน-เวลา
            { wch: 15 },  // ห้อง
            { wch: 15 },  // กลุ่มวิชา
            { wch: 15 },  // จำนวนเปิดรับ
            { wch: 15 },  // จำนวนที่จอง
            { wch: 5 }  // เทอม
        ];
        ws['!cols'] = colWidths;

        // เพิ่ม worksheet เข้าใน workbook
        const sheetName = `รายวิชา ${searchParams.term || ''} ${getStudentTypeDisplayName(searchParams.stdtype)}`;
        XLSX.utils.book_append_sheet(wb, ws, sheetName);

        // สร้างและดาวน์โหลดไฟล์
        const filename = generateExcelFilename(searchParams);
        XLSX.writeFile(wb, filename);

        // แสดงข้อความแจ้งเตือน
        const toast = `
            <div class="toast-container position-fixed bottom-0 end-0 p-3">
                <div class="toast show" role="alert">
                    <div class="toast-header">
                        <i class="bi bi-check-circle-fill text-success me-2"></i>
                        <strong class="me-auto">Export สำเร็จ</strong>
                        <button type="button" class="btn-close" data-bs-dismiss="toast"></button>
                    </div>
                    <div class="toast-body">
                        ดาวน์โหลดไฟล์ ${filename} เรียบร้อยแล้ว
                    </div>
                </div>
            </div>
        `;
        $('body').append(toast);
        
        // ซ่อน toast หลังจาก 3 วินาที
        setTimeout(() => {
            $('.toast').removeClass('show');
        }, 3000);

    } catch (error) {
        console.error('Excel export error:', error);
        alert('เกิดข้อผิดพลาดในการ Export ข้อมูล: ' + error.message);
    }
}

// ฟังก์ชันสำหรับบันทึกข้อมูลการค้นหา
function saveSearchData(searchParams, results) {
    const searchData = {
        params: searchParams,
        results: results,
        timestamp: new Date().getTime()
    };
    localStorage.setItem('courseSearchData', JSON.stringify(searchData));
}

// ฟังก์ชันสำหรับโหลดข้อมูลการค้นหาที่บันทึกไว้
function loadSavedSearchData() {
    const saved = localStorage.getItem('courseSearchData');
    if (saved) {
        try {
            return JSON.parse(saved);
        } catch (e) {
            console.error('Error parsing saved search data:', e);
            localStorage.removeItem('courseSearchData');
        }
    }
    return null;
}

// ฟังก์ชันสำหรับล้างข้อมูลที่บันทึกไว้
function clearSavedSearchData() {
    localStorage.removeItem('courseSearchData');
}

$(document).ready(function() {
    const searchForm = $('#searchForm');
    const spinner = $('#searchSpinner');
    const resultsDiv = $('#results');

    // เริ่มต้น DataTables พร้อม Export buttons
    const courseTable = $('#courseTable').DataTable({
        responsive: true,
        destroy: true,
        dom: 'Bfrtip',
        buttons: [
            {
                extend: 'excel',
                text: '<i class="bi bi-file-earmark-excel"></i> Export Excel',
                className: 'btn btn-success btn-sm',
                exportOptions: {
                    columns: ':not(:last-child)' // ไม่รวมคอลัมน์สุดท้าย (Action)
                },
                filename: function() {
                    const searchParams = getCurrentSearchParams();
                    return generateExcelFilename(searchParams).replace('.xlsx', '');
                },
                title: function() {
                    const searchParams = getCurrentSearchParams();
                    return `รายวิชา ${searchParams.term || ''} ${getStudentTypeDisplayName(searchParams.stdtype)}`;
                }
            },
            {
                extend: 'print',
                text: '<i class="bi bi-printer"></i> พิมพ์',
                className: 'btn btn-info btn-sm',
                exportOptions: {
                    columns: ':not(:last-child)' // ไม่รวมคอลัมน์สุดท้าย (Action)
                },
                title: function() {
                    const searchParams = getCurrentSearchParams();
                    return `รายวิชา ${searchParams.term || ''} ${getStudentTypeDisplayName(searchParams.stdtype)}`;
                }
            },

        ],
        language: {
            url: 'https://cdn.datatables.net/plug-ins/2.0.8/i18n/th.json',
            // Fallback ถ้าโหลดไฟล์ภาษาไม่สำเร็จ
            processing: "กำลังดำเนินการ...",
            search: "ค้นหา:",
            lengthMenu: "แสดง _MENU_ รายการต่อหน้า",
            info: "แสดง _START_ ถึง _END_ จาก _TOTAL_ รายการ",
            infoEmpty: "แสดง 0 ถึง 0 จาก 0 รายการ",
            zeroRecords: "ไม่พบข้อมูล",
            emptyTable: "ไม่มีข้อมูลในตาราง",
            paginate: {
                first: "แรก",
                previous: "ก่อนหน้า",
                next: "ถัดไป",
                last: "สุดท้าย"
            }
        }
    });

    // ฟังก์ชันสำหรับดึงพารามิเตอร์การค้นหาปัจจุบัน
    function getCurrentSearchParams() {
        return {
            term: $('#term').val(),
            stdtype: $('#stdtype').val()
        };
    }

    // โหลดข้อมูลการค้นหาที่บันทึกไว้เมื่อเปิดหน้าเว็บ
    const savedData = loadSavedSearchData();
    if (savedData && savedData.results && savedData.results.length > 0) {
        // เติมข้อมูลในฟอร์มตามที่บันทึกไว้
        if (savedData.params) {
            $('#term').val(savedData.params.term || '');
            $('#stdtype').val(savedData.params.stdtype || '1');
        }
        
        // แสดงผลลัพธ์ที่บันทึกไว้
        displaySearchResults(savedData.results, savedData.params);
        
        // แสดงข้อความแจ้งเตือนว่าเป็นข้อมูลที่บันทึกไว้
        const timestamp = new Date(savedData.timestamp);
        const timeStr = timestamp.toLocaleString('th-TH');
        
        // เพิ่มข้อความแจ้งเตือน
        const alertHtml = `
            <div class="alert alert-info alert-dismissible fade show" role="alert">
                <i class="bi bi-info-circle"></i> แสดงผลการค้นหาที่บันทึกไว้จากเมื่อ: ${timeStr}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        resultsDiv.prepend(alertHtml);
    }

    // เมื่อฟอร์มถูกส่ง
    searchForm.on('submit', async function(event) {
        event.preventDefault();
        
        const term = $('#term').val();
        const stdtype = $('#stdtype').val();
        
        spinner.removeClass('d-none'); // แสดง spinner
        resultsDiv.addClass('d-none');   // ซ่อนตารางเก่า

        try {
            const response = await fetch(`${API_BASE}/course_open`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ term: term, std_type: stdtype }) // ส่งเป็น JSON body
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const courses = await response.json();

            // บันทึกข้อมูลการค้นหาและผลลัพธ์
            const searchParams = { term, stdtype };
            saveSearchData(searchParams, courses);

            // แสดงผลลัพธ์
            displaySearchResults(courses, searchParams);

        } catch (error) {
            console.error('Fetch Error:', error);
            alert('ไม่สามารถดึงข้อมูลได้ โปรดลองอีกครั้ง');
        } finally {
            spinner.addClass('d-none'); // ซ่อน spinner
        }
    });

    // ฟังก์ชันสำหรับแสดงผลลัพธ์การค้นหา
    function displaySearchResults(courses, searchParams) {
        // ล้างข้อมูลเก่าและล้าง buttons ก่อน
        courseTable.clear();
        
        // อัพเดต buttons visibility
        updateButtonsVisibility(courses.length > 0);
        
        courseTable.rows.add(courses.map(course => [
            course.COURSE_ID,
            course.NAME_T,
            course.SECTION,
            course.TNAME,
            course.TIME_T,
            course.ROOM1,
            course.VARNAM,
            course.STD_NUM,
            course.NUM_RESERV,
            course.TERM,
            // สร้างปุ่ม "รายละเอียด"
            `<a href="details.html?courseid=${course.COURSE_ID}&section=${course.SECTION}&term=${encodeURIComponent(searchParams.term)}&stdtype=${searchParams.stdtype}" class="btn btn-info btn-sm">รายละเอียด</a>`
        ])).draw();
        
        resultsDiv.removeClass('d-none'); // แสดงตาราง
    }

    // ฟังก์ชันสำหรับอัพเดตการแสดง/ซ่อน buttons
    function updateButtonsVisibility(hasData) {
        const buttons = courseTable.buttons();
        if (hasData) {
            buttons.container().show();
        } else {
            buttons.container().hide();
        }
    }

    // เพิ่มปุ่มล้างข้อมูลที่บันทึกไว้
    function addClearButton() {
        if (!$('#clearSavedData').length) {
            const clearBtn = `
                <button type="button" id="clearSavedData" class="btn btn-outline-secondary btn-sm ms-2">
                    <i class="bi bi-trash"></i> ล้างข้อมูลที่บันทึก
                </button>
            `;
            $('.container h1').after(clearBtn);
            
            $('#clearSavedData').on('click', function() {
                if (confirm('คุณต้องการล้างข้อมูลการค้นหาที่บันทึกไว้หรือไม่?')) {
                    clearSavedSearchData();
                    location.reload();
                }
            });
        }
    }

    // เพิ่มปุ่มล้างข้อมูลถ้ามีข้อมูลที่บันทึกไว้
    if (savedData && savedData.results && savedData.results.length > 0) {
        addClearButton();
    }

    // ซ่อน export buttons เมื่อเริ่มต้น
    updateButtonsVisibility(false);
});