# 🚀 MASENO UNIVERSITY LMS Deployment Checklist (Render + Supabase)

## ✅ Backend Environment Variables (Render Dashboard → Environment)

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_service_role_key_here (NOT anon key!)
JWT_SECRET=your_secret_here (must match local dev)
PORT=10000 (Render auto-sets)
NODE_ENV=production
```

**Get Service Role Key:** Supabase Dashboard → Settings → API → service_role key

## ✅ Supabase Database Setup

### 1. Run Schema
```
SQL Editor → Paste contents of SUPABASE_SETUP.sql → RUN
```
✅ Tables: `users`, `courses`, `enrollments`, `sessions`, `attendance`, etc.

### 2. RLS Policies (Authentication → Policies)
**Disable RLS for service_role OR add policies:**
```
enrollments → SELECT → true (service_role bypasses RLS)
users → SELECT → true (service_role)
courses → SELECT → true (service_role)
```

### 3. Test Data
```
INSERT users (admin), courses, enrollments manually
```

## ✅ Test Endpoints

### Local (backend running)
```bash
curl http://localhost:5000/api/admin/enrollments?test=1
```

### Deployed
1. Login → F12 → Application → LocalStorage → copy `token`
2. ```bash
curl -H "Authorization: Bearer YOUR_TOKEN" https://maseno-university-lms.onrender.com/api/admin/enrollments
```

## ✅ Render Deployment Steps

1. **Connect GitHub repo**
2. **Settings → Environment → Add vars above**
3. **Build Command:** `npm install`
4. **Start Command:** `node backend/index.js`
5. **Deploy → View Logs**

## ✅ Common Issues & Fixes

| Error | Fix |
|-------|-----|
| `DATABASE_CONNECTION_FAILED` | SUPABASE_URL/KEY wrong/missing |
| `DATABASE_RLS_BLOCKED` | Use service_role key + disable RLS |
| `DATABASE_TABLE_MISSING` | Run SUPABASE_SETUP.sql |
| `Invalid token` | JWT_SECRET mismatch |
| `PGRST116` | No enrollments (normal) |

## ✅ Verification Flow

1. Deploy → Check logs: "Server running on port..."
2. Visit deployed site → Login as admin
3. Admin Dashboard → Enrollments tab
4. ✅ Data loads OR specific error shows

**Last Deployed:** ```bash
git add . && git commit -m "fix: admin enrollments" && git push
```

---

**Status:** Ready to Deploy! Run tests above 👆
