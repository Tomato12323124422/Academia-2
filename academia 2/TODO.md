# Student Features Implementation Plan

## Phase 1: Backend API ✅ COMPLETE
- [x] Create assignments route (backend/routes/assignments.js) - Full CRUD implemented
- [x] Create grades route (backend/routes/grades.js) - Student/teacher grades with calculations
- [x] Update index.js to include new routes - All routes mounted
- [x] Update courses.js to add endpoint for student enrolled courses - /enrolled exists

## Phase 2: Frontend Pages ⏳ IN PROGRESS
- [ ] Update dashboard.js - add student menu items functionality (My Courses, Assignments, Grades)
- [ ] Create courses-browse.html - browse/enroll courses (fetch /api/courses)
- [ ] Create my-courses.html - view enrolled courses (fetch /api/courses/enrolled)
- [ ] Update assignments.html - list assignments (fetch /api/assignments/my-assignments), submit
- [ ] Create grades.html - view grades (fetch /api/grades/my-grades)

## Phase 3: Integration & Testing
- [ ] Connect all frontend to backend APIs
- [ ] Test complete student flow (register → enroll → assignments → grades)
- [ ] Update navigation in dashboard.html/js

**Next Step (1/5 Phase 2):** Update TODO.md ✅
