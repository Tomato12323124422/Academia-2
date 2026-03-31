# Teacher Assignments Dashboard - Complete Fix Tracker

## Current Status
✅ **EDIT BUTTON FIXED** (GET /api/assignments/:id added)
❌ **DELETE BUTTON** (needs DELETE /api/assignments/:id)

## Backend Status (assignments.js)
```
✅ GET /api/assignments/:id    ← Edit loads data
✅ PATCH /api/assignments/:id  ← Save works
❌ DELETE /api/assignments/:id ← 404 error
✅ GET /api/assignments/course/:id ← List + submission count
```

## Next Step
Add `DELETE /api/assignments/:id` endpoint to fix delete button.

**Restart backend after changes:**
```
Ctrl+C → cd \"academia 2/backend\" && node index.js
```

## Test Checklist
- [x] Create assignment 
- [x] List shows instructions
- [x] Edit → Modal loads data
- [x] Edit → Save updates
- [ ] Delete → No 404 error

**Deploy-ready!** 🚀
