# Production Bug Investigation Scenario

Help me investigate and fix a production issue by following these steps:

1. Gather Initial Information:
   - Service name: ${SERVICE_NAME}
   - Environment: Production
   - Incident time: ${INCIDENT_TIME}
   - Alert ID: ${ALERT_ID}
   - Symptoms: ${INCIDENT_SYMPTOMS}

2. Log Analysis:
   - Query Azure Monitor logs for the timeframe:
     - Use azmcp-monitor-log-query for:
       - Application Insights
       - Container logs
       - Platform logs
     - Identify correlated events
     - Extract relevant error messages

3. Deployment Correlation:
   - Check recent deployments:
     - Query deployment workflow runs
     - Review workflow logs
     - Identify relevant commits
   - Analyze build artifacts:
     - Container images
     - Configuration changes
     - Infrastructure updates

4. Root Cause Analysis:
   - Review identified deployment:
     - Code changes
     - Configuration updates
     - Infrastructure modifications
   - Check for:
     - Performance metrics
     - Error patterns
     - Resource utilization
     - Configuration mismatches

5. Fix Implementation:
   - Create fix branch from identified commit
   - Implement necessary changes:
     - Code updates
     - Configuration adjustments
     - Infrastructure modifications
   - Add/update tests to catch similar issues

6. Pull Request Creation:
   - Create PR with:
     - Clear description of the issue
     - Root cause analysis
     - Fix explanation
     - Test coverage
   - Add relevant reviewers
   - Link to incident ticket

7. Validation:
   - Verify fix in lower environment
   - Run full test suite
   - Performance validation
   - Security scan
   
8. Documentation:
   - Update runbook with:
     - Incident details
     - Investigation steps
     - Resolution process
     - Prevention measures

You must ask the user to provide all templating variables when needed, which are hinted with the syntax ${VARIABLE}