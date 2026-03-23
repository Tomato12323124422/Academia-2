# TODO - Fix QR Attendance Error "invalid input syntax for type uuid: '38'"

## Breakdown of approved plan:

✅ **Step 1: Create this TODO.md** - Track progress

**Step 2: Fix backend/routes/attendance.js session_id parsing**
- ✅ Fixed all parseInt, queries, inserts use numbers
- Target POST /attendance, POST /attendance/register insert, POST /scan/mark
- Ensure sessionIdNum used consistently

**Step 3: Fix static file serving in backend/index.js**
- ✅ Fixed static paths: process.cwd()/'frontend' and 'academia 2/frontend'

**Step 4: Update QR to point to form flow**
- ✅ Updated QRData to attendance-form.html
- Frontend attendance-form.html POSTs to /api/attendance/scan/mark (manual form ✅)

**Step 5: Test end-to-end**
- [ ] Teacher: POST /api/attendance/sessions {course_id: UUID}
- [ ] Scan QR → attendance-form.html loads with session/token
- [ ] Submit name/regNo → Success, no UUID error
- [ ] Teacher dashboard: /api/attendance/sessions/ID/attendance shows list

**Step 6: Student dashboard shows history**
- [ ] GET /api/attendance/my-attendance works

**Step 7: attempt_completion**

Current Status: Backend partially fixed (queries parseInt), inserts still need sessionIdNum

Next: Complete backend fixes, static path, QR URL

