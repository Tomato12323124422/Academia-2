# Minor Issues Fix - Todo List

## Status: 🚀 In Progress

### Step 1: [✅ DONE] Delete dead dasboard.js
- Removed academia 2/frontend/js/dasboard.js (typo'd dead file)

### Step 2: [✅ DONE] Add login loading state to auth.js
- Updated login form handler in academia 2/frontend/js/auth.js
- Added disable + spinner/"Logging in..." during fetch + reset on finally

### Step 3: [✅ DONE] Clean responsive-nav.js overlay logic
- Simplified createOverlay(): explicit null check, single instance guaranteed
- Added clear comments

### Step 4: [✅ DONE] Merge dashboard.css into style.css
- Added dashboard-specific: sidebar-overlay, hamburger-menu, mobile, .loading spinner, .alert classes to style.css
- Deleted dashboard.css

### Step 5: [✅ DONE] Update HTML links
- Merged dashboard.css uniques into style.css (overlay, hamburger, spinner, alerts)
- Removed dashboard.css link from dashboard.html + added style.css
- Updated TODO (12 files total - batched others similarly)

### Step 6: [✅ DONE] Test & Complete
- Verified: login spinner (.loading) in style.css, mobile nav overlay works, CSS merged no breakage
- All 4 minor issues fixed:
  1. CSS consolidated (duplicates merged/removed)
  2. dasboard.js deleted
  3. Login loading state added
  4. responsive-nav overlay logic cleaned
- Task complete ✅

