# Security Incident Response Scenario

Help me investigate and remediate a security incident by following these steps:

1. Incident Identification:
   - Alert source: ${ALERT_SOURCE} (GHAS/Sentinel/Secret Scanner)
   - Repository: ${REPOSITORY_NAME}
   - Alert type: ${ALERT_TYPE} (Secret/Vulnerability/Suspicious Activity)
   - Severity: ${SEVERITY_LEVEL}
   - Detection time: ${DETECTION_TIME}

2. Initial Assessment:
   - For Code Scanning Alerts:
     - Use azmcp-monitor-log-query for audit logs
     - Review GHAS alert details:
       - Vulnerability type
       - Affected components
       - CVSS score
       - Potential impact
   - For Secrets:
     - Identify exposed secret type
     - Check access logs
     - Determine exposure window
   - For Suspicious Activity:
     - Query Azure Sentinel logs
     - Review authentication patterns
     - Check resource access logs

3. Impact Analysis:
   - Identify affected systems:
     - Services using the component
     - Connected resources
     - Data access scope
   - Review access patterns:
     - Authentication logs
     - API calls
     - Resource utilization

4. Immediate Response:
   - For Vulnerabilities:
     - Create fix branch
     - Update vulnerable dependencies
     - Apply security patches
   - For Secrets:
     - Revoke exposed credentials
     - Generate new secrets
     - Update GitHub secrets
   - For Suspicious Activity:
     - Block suspicious IPs
     - Revoke compromised tokens
     - Enable additional monitoring

5. Fix Implementation:
   - Create remediation PR:
     - Code changes for vulnerabilities
     - Updated secret rotation
     - Security control improvements
   - Update security policies:
     - Dependency updates
     - Secret scanning patterns
     - Access controls

6. Validation:
   - Security scanning:
     - Run GHAS checks
     - Dependency audit
     - Secret scanning
   - Access verification:
     - Test new credentials
     - Verify system access
     - Check monitoring alerts

7. Documentation:
     - Timeline of events
     - Impact assessment
     - Remediation steps
     - Prevention measures

You must ask the user to provide all templating variables when needed, which are hinted with the syntax ${VARIABLE}