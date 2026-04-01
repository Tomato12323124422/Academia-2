// PWA Service Worker Registration (Fixed)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js')
    .then(reg => console.log('PWA SW registered'))
    .catch(err => console.log('SW reg failed:', err));
}

// Install App Prompt
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
});

window.addEventListener('appinstalled', () => deferredPrompt = null);

// Online/Offline
window.addEventListener('online', () => location.reload());
window.addEventListener('offline', () => {
  const notice = document.createElement('div');
  notice.innerHTML = '⚠️ Offline Mode';
  notice.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#dc3545;color:white;padding:10px;z-index:9999';
  document.body.appendChild(notice);
});

// Use local server for development, or production URL
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:5000' 
    : 'https://academia-2-xgdr.onrender.com';

const API = `${API_BASE}/api`;

let user = null;
let token = localStorage.getItem("token");
try {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
        user = JSON.parse(storedUser);
    }
} catch (err) {
    console.error("Corrupted user data in localStorage:", err);
    localStorage.clear();
    window.location.href = "login.html";
    throw err; // Stop execution
}

if (!user || !token) {
    window.location.href = "login.html";
}

document.getElementById("welcome").innerText =
    "Welcome, " + user.full_name;

const menu = document.getElementById("menu");

/* ===== ROLE BASED MENU ===== */

if (user.role === "student") {
    menu.innerHTML = `
        <li onclick="showStudentDashboard()">📊 Dashboard</li>
        <li onclick="showStudentCourses()">📚 My Courses</li>
        <li onclick="showBrowseCourses()">🔍 Browse Courses</li>
        <li onclick="showStudentAttendance()">📋 Attendance</li>
        <li onclick="showStudentLiveClasses()">📹 Live Classes</li>
    `;
}

if (user.role === "teacher") {
    menu.innerHTML = `
        <li onclick="showInstructorDashboard()">📊 Dashboard</li>
        <li onclick="showCreateCourseForm()">➕ Create Course</li>
        <li onclick="showMyCourses()">📚 My Courses</li>
        <li onclick="showInstructorLiveClasses()">📹 Live Classes</li>
        <li onclick="showInstructorAnalytics()">📈 Analytics</li>
        <li onclick="showTeacherSessionPanel()">📱 Attendance QR</li>
        <li onclick="window.location.href='students.html'">👨‍🎓 Students</li>
    `;
}

if (user.role === "parent") {
    menu.innerHTML = `
        <li onclick="showGuardianDashboard()">📊 Dashboard</li>
        <li onclick="showGuardianChildren()">👨‍👩‍👧 My Children</li>
    `;
}

/* ===== SHARED UTILITIES ===== */
function hideAllPanels() {
    const panels = [
        'studentDeadlinesPanel', 'studentAttendanceHistoryPanel', 'studentLiveClassesPanel',
        'studentCoursesPanel', 'studentAttendancePanel', 'browseCoursesPanel',
        'instructorAnalyticsPanel', 'instructorLiveClassesPanel', 'teacherSessionPanel',
        'attendanceListPanel', 'createCoursePanel', 'myCoursesPanel',
        'courseSessionsPanel', 'courseStudentsPanel',
        'guardianChildrenPanel', 'guardianCoursesPanel', 'guardianGradesPanel',
        'guardianAttendancePanel', 'guardianAssignmentsPanel'
    ];
    
    panels.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = "none";
    });
}

function logout() {
    localStorage.clear();
    window.location.href = "login.html";
}

/* ===== STUDENT DASHBOARD FUNCTIONS ===== */

async function loadStudentDashboard() {
    hideAllPanels();
    document.getElementById("studentCoursesPanel").style.display = "block";
    document.getElementById("studentAttendancePanel").style.display = "block";
    
    await Promise.all([
        loadStudentStats(),
        loadStudentCoursesList()
    ]);
}

async function loadStudentStats() {
    try {
        const coursesRes = await fetch(`${API}/courses/enrolled`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        
        if (coursesRes.ok) {
            const coursesData = await coursesRes.json();
            document.getElementById("courseCount").innerText = coursesData.courses?.length || 0;
        }
        
        const attendRes = await fetch(`${API}/attendance/my-attendance`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        
        if (attendRes.ok) {
            const attendData = await attendRes.json();
            const rate = attendData.summary?.rate || 0;
            document.getElementById("attendance").innerText = rate + "%";
        }
        
    } catch (err) {
        console.error("Error loading student stats:", err);
    }
}

async function loadStudentCoursesList() {
    try {
        const res = await fetch(`${API}/courses/enrolled`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        
        const data = await res.json();
        const container = document.getElementById("studentCoursesList");
        
        if (res.ok && data.courses && data.courses.length > 0) {
            container.innerHTML = data.courses.map(course => `
                <div class="course-card">
                    <h4>${course.title}</h4>
                    <p>${course.description || 'No description'}</p>
                    <span class="category-tag">${course.category || 'General'}</span>
                    ${course.duration ? `<span class="duration-tag">${course.duration}</span>` : ''}
                </div>
            `).join('');
        } else {
            container.innerHTML = "<p>No courses enrolled yet.</p>";
        }
        
    } catch (err) {
        console.error("Error loading courses:", err);
        document.getElementById("studentCoursesList").innerHTML = "<p>Error loading courses.</p>";
    }
}

function showStudentDashboard() {
    loadStudentDashboard();
}

function showStudentCourses() {
    hideAllPanels();
    document.getElementById("studentCoursesPanel").style.display = "block";
    loadStudentCoursesList();
}

function showStudentAttendance() {
    hideAllPanels();
    document.getElementById("studentAttendancePanel").style.display = "block";
}

function showStudentLiveClasses() {
    hideAllPanels();
    document.getElementById("studentLiveClassesPanel").style.display = "block";
    loadStudentLiveClasses();
}

async function loadStudentLiveClasses() {
    try {
        const res = await fetch(`${API}/live-class/upcoming`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        
        const data = await res.json();
        const container = document.getElementById("studentLiveClasses");
        
        if (res.ok && data.sessions && data.sessions.length > 0) {
            container.innerHTML = data.sessions.map(liveClass => {
                const scheduled = new Date(liveClass.scheduled_at).toLocaleString();
                const now = new Date();
                const isLive = new Date(liveClass.scheduled_at) < now;
                return `
                <div class="live-class-item ${isLive ? 'live-now' : ''}">
                    <div class="live-class-info">
                        <h4>${liveClass.course?.title || 'Course'}</h4>
                        <p>${liveClass.title}</p>
                        <p>Scheduled: ${scheduled}</p>
                    </div>
                    <div>
                        <a href="${liveClass.zoom_link}" target="_blank" class="join-btn" style="${isLive ? '' : 'opacity: 0.5; pointer-events: none;'}">
                            ${isLive ? 'Join Live' : 'Not Started'}
                        </a>
                    </div>
                </div>
                `;
            }).join('');
        } else {
            container.innerHTML = "<p>No upcoming live classes.</p>";
        }
        
    } catch (err) {
        console.error("Error loading live classes:", err);
        document.getElementById("studentLiveClasses").innerHTML = "<p>Error loading live classes.</p>";
    }
}

function showBrowseCourses() {
    hideAllPanels();
    document.getElementById("browseCoursesPanel").style.display = "block";
    loadBrowseCourses();
}

/* ===== INSTRUCTOR DASHBOARD FUNCTIONS ===== */

async function loadInstructorDashboard() {
    hideAllPanels();
    document.getElementById("instructorAnalyticsPanel").style.display = "block";
    document.getElementById("instructorLiveClassesPanel").style.display = "block";
    document.getElementById("teacherSessionPanel").style.display = "block";
    document.getElementById("attendanceListPanel").style.display = "block";
    document.getElementById("myCoursesPanel").style.display = "block";
    
    await Promise.all([
        loadInstructorStats(),
        loadMyCourses(),
        loadInstructorAnalytics(),
        loadInstructorLiveClasses(),
        checkActiveSession()
    ]);
}

async function loadInstructorStats() {
    try {
        const res = await fetch(`${API}/courses/my-courses`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        
        const data = await res.json();
        
        if (res.ok) {
            document.getElementById("courseCount").innerText = data.courses?.length || 0;
        }
        
        document.getElementById("attendance").innerText = "-";
        
    } catch (err) {
        console.error("Error loading instructor stats:", err);
    }
}

async function loadInstructorLiveClasses() {
    // Load teacher's courses for dropdown
    try {
        const coursesRes = await fetch(`${API}/courses/my-courses`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const coursesData = await coursesRes.json();
        const courseSelect = document.getElementById("liveCourseSelect");
        courseSelect.innerHTML = '<option value="">Select course...</option>' + coursesData.courses.map(course => 
            `<option value="${course.id}">${course.title}</option>`
        ).join('');
    } catch (err) {
        console.error('Error loading courses:', err);
    }

    // Load scheduled classes
    try {
        const res = await fetch(`${API}/live-class/upcoming`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await res.json();
        const container = document.getElementById("scheduledClassesList");
        
        if (res.ok && data.sessions && data.sessions.length > 0) {
            container.innerHTML = data.sessions.map(cls => {
                const scheduled = new Date(cls.scheduled_at).toLocaleString();
                return `
                    <div class="deadline-item">
                        <div class="deadline-info">
                            <h4>${cls.course?.title || 'Course'} - ${cls.title}</h4>
                            <p>${scheduled}</p>
                        </div>
                        <div class="deadline-date">
                            <a href="${cls.zoom_link}" target="_blank" class="join-btn">Zoom Link</a>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            container.innerHTML = "<p>No scheduled classes yet.</p>";
        }
    } catch (err) {
        console.error("Error loading scheduled classes:", err);
        document.getElementById("scheduledClassesList").innerHTML = "<p>Error loading classes.</p>";
    }
}

function showInstructorDashboard() {
    loadInstructorDashboard();
}

/* ===== GUARDIAN FUNCTIONS ===== */
let selectedChildId = null;

async function loadGuardianDashboard() {
    hideAllPanels();
    document.getElementById("guardianChildrenPanel").style.display = "block";
    document.getElementById("guardianCoursesPanel").style.display = "block";
    document.getElementById("guardianGradesPanel").style.display = "block";
    document.getElementById("guardianAttendancePanel").style.display = "block";
    
    await loadGuardianChildren();
}

async function loadGuardianChildren() {
    try {
        const res = await fetch(`${API}/guardian/children`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        
        const data = await res.json();
        const container = document.getElementById("childrenList");
        
        if (res.ok && data.children && data.children.length > 0) {
            container.innerHTML = data.children.map(child => `
                <div class="child-info-card" onclick="selectChild('${child.id}', '${child.full_name}')" style="cursor: pointer;">
                    <h4>👨‍🎓 ${child.full_name}</h4>
                    <p>${child.email}</p>
                    <p style="color: #666; font-size: 12px;">Relationship: ${child.relationship || 'Child'}</p>
                </div>
            `).join('');
            
            if (!selectedChildId && data.children.length > 0) {
                selectChild(data.children[0].id, data.children[0].full_name);
            }
        } else {
            container.innerHTML = "<p>No children linked to your account. Search for a child above to link.</p>";
        }
        
    } catch (err) {
        console.error("Error loading children:", err);
        document.getElementById("childrenList").innerHTML = "<p>Error loading children.</p>";
    }
}

async function selectChild(childId, childName) {
    selectedChildId = childId;
    document.getElementById("welcome").innerText = `Dashboard - ${childName}`;
    
    await Promise.all([
        loadGuardianCourses(childId),
        loadGuardianGrades(childId),
        loadGuardianAttendance(childId)
    ]);
}

async function loadGuardianCourses(childId) {
    try {
        const res = await fetch(`${API}/guardian/child/${childId}/courses`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        
        const data = await res.json();
        const container = document.getElementById("guardianCourses");
        
        if (res.ok && data.courses && data.courses.length > 0) {
            container.innerHTML = data.courses.map(course => `
                <div class="course-card">
                    <h4>${course.title}</h4>
                    <p>${course.description || 'No description'}</p>
                    <p><strong>Teacher:</strong> ${course.teacher}</p>
                    <span class="category-tag">${course.category || 'General'}</span>
                    ${course.duration ? `<span class="duration-tag">${course.duration}</span>` : ''}
                </div>
            `).join('');
        } else {
            container.innerHTML = "<p>No courses enrolled yet.</p>";
        }
        
    } catch (err) {
        console.error("Error loading courses:", err);
        document.getElementById("guardianCourses").innerHTML = "<p>Error loading courses.</p>";
    }
}

async function loadGuardianGrades(childId) {
    try {
        const res = await fetch(`${API}/guardian/child/${childId}/grades`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        
        const data = await res.json();
        const container = document.getElementById("guardianGrades");
        
        if (res.ok && data.grades && data.grades.length > 0) {
            const overall = data.overall;
            container.innerHTML = `
                <div class="analytics-card" style="margin-bottom: 20px;">
                    <h4>Overall Grade: ${overall.letter_grade} (${overall.percentage}%)</h4>
                    <div class="analytics-stats">
                        <div class="stat">
                            <span class="stat-value">${overall.earned_points}</span>
                            <span class="stat-label">Points Earned</span>
                        </div>
                        <div class="stat">
                            <span class="stat-value">${overall.total_points}</span>
                            <span class="stat-label">Total Points</span>
                        </div>
                    </div>
                </div>
                ${data.grades.slice(0, 10).map(grade => `
                    <div class="deadline-item">
                        <div class="deadline-info">
                            <h4>${grade.assignment_title}</h4>
                            <p>${grade.course_name}</p>
                        </div>
                        <div class="deadline-date">
                            <span class="days-left" style="color: ${grade.percentage >= 60 ? '#28a745' : '#dc3545'}">
                                ${grade.grade}/${grade.points} (${grade.percentage}%)
                            </span>
                        </div>
                    </div>
                `).join('')}
            `;
        } else {
            container.innerHTML = "<p>No grades available yet.</p>";
        }
        
    } catch (err) {
        console.error("Error loading grades:", err);
        document.getElementById("guardianGrades").innerHTML = "<p>Error loading grades.</p>";
    }
}

async function loadGuardianAttendance(childId) {
    try {
        const res = await fetch(`${API}/guardian/child/${childId}/attendance`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        
        const data = await res.json();
        const container = document.getElementById("guardianAttendance");
        
        if (res.ok) {
            const summary = data.summary;
            
            container.innerHTML = `
                <div class="analytics-card" style="margin-bottom: 20px;">
                    <h4>Attendance Rate: ${summary.rate}%</h4>
                    <div class="analytics-stats">
                        <div class="stat">
                            <span class="stat-value">${summary.present}</span>
                            <span class="stat-label">Present</span>
                        </div>
                        <div class="stat">
                            <span class="stat-value">${summary.absent}</span>
                            <span class="stat-label">Absent</span>
                        </div>
                        <div class="stat">
                            <span class="stat-value">${summary.total}</span>
                            <span class="stat-label">Total</span>
                        </div>
                    </div>
                </div>
                ${(data.attendance || []).slice(0, 10).map(record => `
                    <div class="deadline-item">
                        <div class="deadline-info">
                            <h4>${record.session?.course?.title || 'Unknown Course'}</h4>
                            <p>${new Date(record.marked_at).toLocaleDateString()}</p>
                        </div>
                        <div class="deadline-date">
                            <span class="days-left" style="color: ${record.status === 'present' ? '#28a745' : '#dc3545'}">
                                ${record.status === 'present' ? '✓ Present' : '✗ Absent'}
                            </span>
                        </div>
                    </div>
                `).join('')}
            `;
        } else {
            container.innerHTML = "<p>No attendance data available.</p>";
        }
        
    } catch (err) {
        console.error("Error loading attendance:", err);
        document.getElementById("guardianAttendance").innerHTML = "<p>Error loading attendance.</p>";
    }
}

function showGuardianDashboard() {
    document.getElementById("welcome").innerText = "Welcome, " + user.full_name;
    loadGuardianDashboard();
}

function showGuardianChildren() {
    loadGuardianChildren();
}

/* ===== TEACHER COURSE FUNCTIONS ===== */

function showCreateCourseForm() {
    hideAllPanels();
    document.getElementById("createCoursePanel").style.display = "block";
}

function hideCreateCourseForm() {
    showMyCourses();
}

function showMyCourses() {
    hideAllPanels();
    document.getElementById("myCoursesPanel").style.display = "block";
    document.getElementById("teacherSessionPanel").style.display = "block";
    document.getElementById("attendanceListPanel").style.display = "block";
    loadMyCourses();
}

function showTeacherSessionPanel() {
    hideAllPanels();
    document.getElementById("teacherSessionPanel").style.display = "block";
    document.getElementById("attendanceListPanel").style.display = "block";
    checkActiveSession();
}

const createCourseForm = document.getElementById("createCourseForm");
if (createCourseForm) {
    createCourseForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const title = document.getElementById("courseTitle").value;
        const description = document.getElementById("courseDescription").value;
        const category = document.getElementById("courseCategory").value;
        const duration = document.getElementById("courseDuration").value;

        try {
            const res = await fetch(`${API}/courses`, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ title, description, category, duration })
            });

            const data = await res.json();

            if (res.ok) {
                alert("Course created successfully!");
                createCourseForm.reset();
                hideCreateCourseForm();
                loadMyCourses();
            } else {
                alert(data.message || "Failed to create course");
            }

        } catch (err) {
            console.error(err);
            alert("Network error - could not create course");
        }
    });
}

async function loadMyCourses() {
    if (user.role !== "teacher") return;

    try {
        const res = await fetch(`${API}/courses/my-courses`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        const data = await res.json();

        if (res.ok) {
            const coursesList = document.getElementById("myCoursesList");
            const courseCount = document.getElementById("courseCount");
            
            if (data.courses && data.courses.length > 0) {
                courseCount.innerText = data.courses.length;
                coursesList.innerHTML = data.courses.map(course => `
                    <div class="course-card">
                        <h4>${course.title}</h4>
                        <p>${course.description}</p>
                        <span class="category-tag">${course.category}</span>
                        <span class="duration-tag">${course.duration || 'Not specified'}</span>
                        <div style="margin-top: 15px;">
                            <button class="primary-btn" onclick="startClass('${course.id}')" style="font-size: 12px; padding: 8px 16px;">Start Class</button>
                            <button class="secondary-btn" onclick="viewCourseStudents('${course.id}')" style="font-size: 12px; padding: 8px 16px; margin-left: 5px;">View Students</button>
                            <button class="secondary-btn" onclick="viewCourseSessions('${course.id}')" style="font-size: 12px; padding: 8px 16px; margin-left: 5px;">View Sessions</button>
                        </div>
                    </div>
                `).join('');
            } else {
                courseCount.innerText = "0";
                coursesList.innerHTML = "<p>No courses created yet. Click 'Create Course' to get started!</p>";
            }
        }

    } catch (err) {
        console.error("Error loading courses:", err);
    }
}

/* ===== SESSION FUNCTIONS ===== */

let currentSessionId = null;
let qrRefreshInterval = null;
let attendanceRefreshInterval = null;

async function startClass(courseId) {
    try {
        const res = await fetch(`${API}/attendance/sessions`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ course_id: courseId })
        });

        const data = await res.json();

        if (res.ok) {
            currentSessionId = data.session.id;
            showActiveSession(currentSessionId);
        }

    } catch (err) {
        console.error(err);
    }
}

async function checkActiveSession() {
    // Implementation remains the same
    if (user.role !== "teacher") return;
    // ... rest of implementation
}

function showInstructorAnalytics() {
    hideAllPanels();
    document.getElementById("instructorAnalyticsPanel").style.display = "block";
    loadInstructorAnalytics();
}
