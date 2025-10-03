# Pre-Deployment Checklist

Use this checklist before deploying to production.

## 📋 Code Quality

- [ ] All tests passing locally (`npm test`)
- [ ] No linting errors (`npm run lint`)
- [ ] No type errors (`npm run type-check`)
- [ ] Code reviewed by at least one other developer
- [ ] All PR comments addressed and resolved

## 🗄️ Database

- [ ] New migrations tested locally
- [ ] Migrations are idempotent (can be run multiple times safely)
- [ ] Rollback plan documented
- [ ] No breaking changes to existing data
- [ ] RLS policies updated if schema changed
- [ ] Indexes added for new queries

## 🔐 Security

- [ ] No secrets committed to git
- [ ] Environment variables updated in Vercel
- [ ] API keys rotated if compromised
- [ ] New routes protected with authentication
- [ ] RLS policies tested for new tables
- [ ] CORS settings reviewed

## 🧪 Testing

- [ ] Integration tests pass (`npm run test:integration`)
- [ ] E2E smoke test passes (`npm run test:smoke`)
- [ ] Manual testing completed on preview deployment
- [ ] Edge cases tested (empty states, errors, etc.)
- [ ] Performance tested (no slow queries)

## 📦 Dependencies

- [ ] No vulnerable dependencies (`npm audit`)
- [ ] Dependencies updated to latest stable versions
- [ ] Lockfile committed (`package-lock.json`)
- [ ] Build succeeds (`npm run build`)

## 📝 Documentation

- [ ] README updated if setup changed
- [ ] New features documented
- [ ] Migration guide updated if needed
- [ ] API changes documented
- [ ] Breaking changes noted in CHANGELOG

## 🚀 Deployment

### Pre-Deploy

- [ ] Create deployment branch from `main`
- [ ] Tag release: `git tag v1.x.x`
- [ ] Update version in `package.json`
- [ ] Generate CHANGELOG entry

### Deploy Steps

1. **Merge to main**
   ```bash
   git checkout main
   git merge --no-ff feature-branch
   git push origin main
   ```

2. **Monitor CI/CD**
   - Watch GitHub Actions: https://github.com/your-org/auditvia/actions
   - Ensure all checks pass (tests, linting, type check)

3. **Verify Vercel Deployment**
   - Check Vercel dashboard for deployment status
   - Verify preview URL before promoting to production

4. **Apply Migrations (Automatic)**
   - CI/CD automatically applies migrations
   - Monitor logs for any errors

5. **Smoke Test Production**
   ```bash
   # Test critical paths
   - Login/logout
   - Create site
   - Run scan
   - View report
   - Create GitHub issue
   ```

### Post-Deploy

- [ ] Verify production site loads
- [ ] Check Supabase dashboard for errors
- [ ] Monitor Vercel logs for exceptions
- [ ] Test critical user flows manually
- [ ] Notify team in Slack
- [ ] Monitor for 30 minutes post-deployment

## 🔄 Rollback Plan

If issues are detected:

1. **Revert deployment via Vercel:**
   - Go to Vercel dashboard → Deployments
   - Find last working deployment
   - Click "Promote to Production"

2. **Rollback migrations (if needed):**
   ```bash
   cd supabase/migrations
   git mv XXXX_problematic_migration.sql _archive/
   npx supabase db push
   ```

3. **Revert code via Git:**
   ```bash
   git revert <commit-hash>
   git push origin main
   ```

## 📊 Monitoring

### First 24 Hours

- [ ] Check error rates in Vercel logs
- [ ] Monitor Supabase query performance
- [ ] Watch for increased load times
- [ ] Check user feedback channels
- [ ] Review analytics for usage drops

### Metrics to Watch

- **Response times**: < 500ms for API routes
- **Error rate**: < 1% of requests
- **Database queries**: < 100ms for common queries
- **Uptime**: 99.9%+

## 🚨 Emergency Contacts

- **DevOps Lead**: [Contact info]
- **Database Admin**: [Contact info]
- **On-call Engineer**: [Contact info]

---

## Quick Reference

### Common Commands

```bash
# Run full test suite
npm test

# Build for production
npm run build

# Apply migrations
npm run db:push

# Rollback last migration
cd supabase/migrations && git mv latest_migration.sql _archive/

# Check deployment status
vercel list

# View production logs
vercel logs --prod
```

### Useful Links

- **GitHub Actions**: https://github.com/your-org/auditvia/actions
- **Vercel Dashboard**: https://vercel.com/your-org/auditvia
- **Supabase Dashboard**: https://app.supabase.com/project/your-project
- **Error Tracking**: [Sentry/Datadog/etc.]

---

**Remember**: If in doubt, don't deploy. It's better to delay than to cause downtime.

