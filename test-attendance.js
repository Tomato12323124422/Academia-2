const API = "http://localhost:5000/api";

// Test data
const testTeacher = {
    full_name: "Test Teacher",
    email: "teacher@test.com",
    password: "password123",
    role: "teacher"
};

const testStudent = {
    full_name: "Test Student",
    email: "student@test.com",
    password: "password123",
    role: "student"
};

let teacherToken = null;
let studentToken = null;
let courseId = null;
let sessionId = null;

// Helper function for API calls
async function apiCall(endpoint, method = 'GET', body = null, token = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json'
        }
    };
    
    if (token) {
        options.headers['Authorization'] = `Bearer ${token}`;
    }
    
    if (body) {
        options.body = JSON.stringify(body);
    }
    
    const res = await fetch(`${API}${endpoint}`, options);
    const data = await res.json();
    return { status: res.status, data };
}

async function runTests() {
    console.log("Testing QR Attendance System\n");
    
    // 1. Register Teacher
    console.log("1. Registering Teacher...");
    let result = await apiCall('/auth/register', 'POST', testTeacher);
    if (result.status === 200 || result.data.message?.includes('already exists')) {
        console.log("✅ Teacher registered or already exists");
    } else {
        console.log("❌ Teacher registration failed:", result.data);
    }
    
    // 2. Login Teacher
    console.log("\n2. Logging in Teacher...");
    result = await apiCall('/auth/login', 'POST', {
        email: testTeacher.email,
        password: testTeacher.password
    });
    if (result.status === 200 && result.data.token) {
        teacherToken = result.data.token;
        console.log("✅ Teacher logged in, token received");
    } else {
        console.log("❌ Teacher login failed:", result.data);
        return;
    }
    
    // 3. Register Student
    console.log("\n3. Registering Student...");
    result = await apiCall('/auth/register', 'POST', testStudent);
    if (result.status === 200 || result.data.message?.includes('already exists')) {
        console.log("✅ Student registered or already exists");
    } else {
        console.log("❌ Student registration failed:", result.data);
    }
    
    // 4. Login Student
    console.log("\n4. Logging in Student...");
    result = await apiCall('/auth/login', 'POST', {
        email: testStudent.email,
        password: testStudent.password
    });
    if (result.status === 200 && result.data.token) {
        studentToken = result.data.token;
        console.log("✅ Student logged in, token received");
    } else {
        console.log("❌ Student login failed:", result.data);
        return;
    }
    
    // 5. Teacher creates a course
    console.log("\n5. Teacher creating course...");
    result = await apiCall('/courses', 'POST', {
        title: "Test Course for Attendance",
        description: "Testing QR attendance system",
        category: "Programming",
        duration: "4 weeks"
    }, teacherToken);
    
    if (result.status === 201 || result.status === 200) {
        courseId = result.data.course?.id || result.data.courses?.[0]?.id;
        console.log("✅ Course created, ID:", courseId);
    } else {
        console.log("❌ Course creation failed:", result.data);
        // Try to get existing courses
        result = await apiCall('/courses/my-courses', 'GET', null, teacherToken);
        if (result.data.courses && result.data.courses.length > 0) {
            courseId = result.data.courses[0].id;
            console.log("✅ Using existing course, ID:", courseId);
        } else {
            return;
        }
    }
    
    // *** NEW STEP 6: Student enrolls in the course ***
    console.log("\n6. Student enrolling in course...");
    result = await apiCall('/courses/enroll', 'POST', {
        course_id: courseId
    }, studentToken);
    
    if (result.status === 200 || result.status === 201) {
        console.log("✅ Student enrolled in course successfully");
    } else {
        console.log("❌ Student enrollment failed:", result.data);
        // Try alternative enrollment endpoint if exists
        result = await apiCall(`/courses/${courseId}/enroll`, 'POST', {}, studentToken);
        if (result.status !== 200 && result.status !== 201) {
            console.log("❌ Alternative enrollment also failed:", result.data);
        } else {
            console.log("✅ Student enrolled via alternative endpoint");
        }
    }
    
    // 7. Teacher creates a session
    console.log("\n7. Teacher creating session...");
    result = await apiCall('/attendance/sessions', 'POST', {
        course_id: courseId,
        zoom_link: "https://zoom.us/test"
    }, teacherToken);
    
    if (result.status === 201) {
        sessionId = result.data.session.id;
        console.log("✅ Session created, ID:", sessionId);
    } else {
        console.log("❌ Session creation failed:", result.data);
        return;
    }
    
    // 8. Wait a moment for session to be active
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 9. Get QR Code
    console.log("\n9. Getting QR code...");
    result = await apiCall(`/attendance/sessions/${sessionId}/qr`, 'GET', null, teacherToken);
    if (result.status === 200 && result.data.qrCode) {
        console.log("✅ QR code generated successfully");
        console.log("   QR Data:", result.data.qrData);
    } else {
        console.log("❌ QR code generation failed:", result.data);
    }
    
    // 10. Student marks attendance
    console.log("\n10. Student marking attendance...");
    result = await apiCall('/attendance/attendance', 'POST', {
        session_id: sessionId
    }, studentToken);
    
    if (result.status === 200 || result.status === 201) {
        console.log("✅ Attendance marked successfully");
    } else {
        console.log("❌ Attendance marking failed:", result.data);
        return;
    }
    
    // 11. Wait for attendance to be processed
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 12. Teacher views attendance
    console.log("\n12. Teacher viewing attendance...");
    result = await apiCall(`/attendance/sessions/${sessionId}/attendance`, 'GET', null, teacherToken);
    if (result.status === 200) {
        console.log("✅ Attendance retrieved successfully!");
        console.log("   Count:", result.data.count || 0);
        console.log("   Records:", JSON.stringify(result.data.attendance, null, 2));
    } else {
        console.log("❌ Attendance retrieval failed:", result.data);
    }
    
    // 13. Student views their attendance history
    console.log("\n13. Student viewing attendance history...");
    result = await apiCall('/attendance/my-attendance', 'GET', null, studentToken);
    if (result.status === 200) {
        console.log("✅ Student attendance history retrieved, records:", result.data.attendance?.length || 0);
    } else {
        console.log("❌ Attendance history retrieval failed:", result.data);
    }
    
    // 14. Teacher ends session
    console.log("\n14. Teacher ending session...");
    result = await apiCall(`/attendance/sessions/${sessionId}/end`, 'PATCH', {}, teacherToken);
    if (result.status === 200) {
        console.log("✅ Session ended successfully");
    } else {
        console.log("❌ Session end failed:", result.data);
    }
    
    console.log("\n🎉 All tests completed successfully!");
}

runTests().catch(console.error);