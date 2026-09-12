# AI Agent Dispute Context Awareness - Deployment Checklist

## Pre-Deployment Verification

### Code Review & Testing
- [ ] Code review completed and approved
- [ ] All 10 test scenarios from AI_DISPUTES_TESTING_GUIDE.md passed
- [ ] Performance baseline verified (< 2 seconds response time)
- [ ] No console errors or warnings during testing
- [ ] Database queries validated and optimized
- [ ] Error handling verified with database failures

### Environment Setup
- [ ] Staging environment mirrors production
- [ ] Supabase project configured with disputes table
- [ ] Database indexes created:
  ```sql
  CREATE INDEX idx_disputes_user_id ON disputes(user_id);
  CREATE INDEX idx_disputes_status ON disputes(status);
  CREATE INDEX idx_disputes_response_by ON disputes(response_by);
  ```
- [ ] OpenAI API keys configured
- [ ] Backend environment variables set
- [ ] CORS configuration updated if needed

### Backup & Recovery
- [ ] Database backup created before deployment
- [ ] Backup verification completed
- [ ] Rollback procedure documented and tested
- [ ] Deployment script tested in staging

## Deployment Steps

### Step 1: Pre-Deployment Notification
- [ ] Notify team of upcoming deployment
- [ ] Inform support team about new dispute context feature
- [ ] Set maintenance window if needed
- [ ] Prepare communication for any service interruption

### Step 2: File Deployment
- [ ] Deploy updated `/backend/trpc/routes/ai-agents.ts`
  ```bash
  # From workspace root
  scp rork-work3/expo/backend/trpc/routes/ai-agents.ts \
      [user@server]:/path/to/backend/trpc/routes/ai-agents.ts
  ```
- [ ] Verify file permissions: `644` or `755` as appropriate
- [ ] Verify file owner and group are correct
- [ ] Do NOT deploy frontend files (no changes needed)

### Step 3: Backend Restart
- [ ] Stop backend service:
  ```bash
  systemctl stop rork-backend
  # or
  pm2 stop api
  ```
- [ ] Wait for graceful shutdown (30 seconds)
- [ ] Verify process fully stopped: `ps aux | grep node`
- [ ] Start backend service:
  ```bash
  systemctl start rork-backend
  # or
  pm2 start api
  ```
- [ ] Wait for service to become ready (check logs)
- [ ] Verify service is running: `systemctl status rork-backend`

### Step 4: Service Health Check
- [ ] Backend API responding: `curl http://localhost:3000/health`
- [ ] Database connection working: check logs for connection success
- [ ] OpenAI API connectivity verified
- [ ] No startup errors in logs

### Step 5: Smoke Testing
- [ ] Perform smoke test with known test user:
  ```bash
  curl -X POST http://localhost:3000/trpc/aiAgents.chat \
    -H "Content-Type: application/json" \
    -d '{
      "userId": "[TEST_USER_ID]",
      "agentId": "[AGENT_ID]",
      "message": "What disputes do I have?",
      "history": []
    }'
  ```
- [ ] Verify response is successful (no errors)
- [ ] Check response contains expected data
- [ ] Monitor logs for any warnings

### Step 6: Gradual Rollout
- [ ] Deploy to 10% of users first (if using feature flags)
- [ ] Monitor error rates and response times
- [ ] Check support tickets for issues
- [ ] After 1 hour with no issues, increase to 50%
- [ ] After another 1 hour with no issues, roll out to 100%

### Step 7: Monitoring Setup
- [ ] Configure monitoring alerts:
  - [ ] API response time > 5 seconds
  - [ ] Error rate > 1%
  - [ ] Database query time > 500ms
  - [ ] AI token usage anomalies
- [ ] Set up log aggregation for `[AI Agents]` messages
- [ ] Create dashboard for dispute context metrics
- [ ] Set up Slack/email notifications for alerts

### Step 8: Documentation Update
- [ ] Update API documentation with dispute context feature
- [ ] Update user-facing documentation
- [ ] Update support documentation with new feature
- [ ] Create internal wiki entry for troubleshooting
- [ ] Update team README

## Post-Deployment Verification

### Immediate (First 1 Hour)
- [ ] Check error logs: `grep -i error /var/log/rork/ai-agents.log`
- [ ] Monitor response times
- [ ] Verify no database connection issues
- [ ] Check OpenAI API usage is normal
- [ ] Monitor user complaints in support channels

### Short Term (First 24 Hours)
- [ ] Review full logs for any warnings
- [ ] Analyze response time distribution
- [ ] Check database query performance
- [ ] Verify all test users can chat successfully
- [ ] Confirm deadline alerts working correctly
- [ ] Monitor token usage trends

### Medium Term (First Week)
- [ ] Generate performance report
- [ ] Analyze user engagement with dispute feature
- [ ] Review support tickets related to new feature
- [ ] Validate all success criteria met
- [ ] Compare metrics to pre-deployment baseline

## Performance Metrics to Track

### Response Time
- **Target**: < 2 seconds average
- **Acceptable**: < 3 seconds 99th percentile
- **Alert if**: > 5 seconds
- **Metric**: `POST /trpc/aiAgents.chat` latency

### Database Queries
- **Target**: < 50ms for dispute loading
- **Metric**: `SELECT * FROM disputes WHERE user_id = ?`
- **Alert if**: > 100ms average
- **Index**: Ensure `idx_disputes_user_id` is being used

### Error Rate
- **Target**: < 0.1%
- **Alert if**: > 1%
- **Monitor**: HTTP 500 errors, database connection errors

### Token Usage
- **Target**: Dispute context adds < 200 tokens per message
- **Monitor**: Track against OpenAI usage dashboard
- **Alert if**: Significant increase from baseline

### Active Users
- **Monitor**: Users engaging with dispute-related queries
- **Target**: Normal user behavior patterns
- **Alert if**: Unusual spikes or drops

## Rollback Procedure

If critical issues occur after deployment, follow this procedure:

### Immediate Rollback (If Critical)
1. Stop backend service: `systemctl stop rork-backend`
2. Restore previous version of ai-agents.ts from backup
3. Restart backend: `systemctl start rork-backend`
4. Verify service health
5. Notify team of rollback

### Database State Verification
- No schema changes, so no database rollback needed
- Disputes data is unchanged
- Previous version should work with existing data

### Communication
- [ ] Notify team of rollback
- [ ] Update status page if needed
- [ ] Document root cause
- [ ] Create ticket for investigation

## Success Criteria

Consider deployment successful when:

- ✅ All smoke tests pass
- ✅ Response times within acceptable range
- ✅ Error rate below threshold
- ✅ No database connectivity issues
- ✅ Dispute context appears in agent responses
- ✅ Deadline alerts functioning correctly
- ✅ No support complaints about new feature
- ✅ Users can successfully chat about disputes
- ✅ Overdue disputes flagged appropriately
- ✅ 7-day deadline warnings detected
- ✅ Performance metrics match baseline

## Timeline

- **Pre-deployment**: 2 hours (verification, backup)
- **Deployment**: 30 minutes (file copy, restart)
- **Health checks**: 15 minutes
- **Smoke testing**: 15 minutes
- **Gradual rollout**: 3 hours (10% → 50% → 100%)
- **Post-deployment verification**: 24 hours (monitoring)

**Total deployment time: ~4-6 hours**

## Contacts & Escalation

- **Technical Lead**: [Name/Contact]
- **DevOps**: [Name/Contact]
- **Support**: [Email/Channel]
- **Product**: [Name/Contact]

## Sign-Off

- [ ] Deployment approved by: _______________
- [ ] Deployed by: _______________
- [ ] Date: _______________
- [ ] Time: _______________
- [ ] Status: ☐ Successful ☐ Rollback ☐ Partial

## Notes

_Space for deployment notes, issues encountered, solutions applied, etc._

```
_______________________________________________________________________

_______________________________________________________________________

_______________________________________________________________________
```

## Related Documentation

- See `/workspace/AI_DISPUTES_TESTING_GUIDE.md` for test procedures
- See `/workspace/IMPLEMENTATION_COMPLETE.md` for technical details
- See `/workspace/AI_DISPUTES_CODE_WALKTHROUGH.md` for code changes
