# Coverage Compass - User Guide

Coverage Compass is a decision-support tool designed to help you navigate the choice between Medigap and Medicare Advantage. It scores your preferences and models risk without selling you a plan.

## Features
- **Unbiased Recommendation**: Analyzes Medigap, MA PPO, and MA HMO options.
- **Lockout Warnings**: Warns you about state-specific Medigap underwriting lockouts.
- **Friction Modeling**: Evaluates administrative friction like prior authorizations and network restrictions.
- **Assistance Modeling**: Factors in LIS, MSP, or Medicaid when relevant.
- **Visible Confidence Banner**: Surfaces recommendation confidence and uncertainty drivers in the main result.
- **Decision Trace**: Shows the main reasoning path directly in the result instead of hiding it behind the raw audit tools.
- **Profile Snapshot Comparison**: Saves profile states locally so you can compare two answer sets and inspect what changed.
- **Recommendation Sensitivity**: Highlights which answered questions are most responsible for the current recommendation and which ones could flip it.
- **Local Privacy**: Your health data stays in your browser.

## Step-by-Step Usage
1. **Start**: Read the welcome screen and click **Start**.
2. **Disclaimers**: Review the key disclosures. This tool is for educational purposes only. Click **Continue**.
3. **Answer Questions**: The engine will ask about your risk tolerance, provider needs, and current situation. Answer honestly for the best result.
4. **Review Results**: The tool will generate a recommendation, a visible confidence banner, a compact decision trace, a snapshot comparison workspace, and a sensitivity panel.
5. **Inspect Sensitivity**: Use the sensitivity section to see which answers are carrying the most weight and which ones could flip the result.
6. **Compare Snapshots**: Save the current profile, choose a saved snapshot, and inspect recommendation, confidence, and answer-level differences.
7. **Save/Export**: Your progress is auto-saved locally. If you wish to share your results, use the "Safe" export option to redact sensitive data.

## Troubleshooting
- **Lost Progress**: If you clear your browser cache, your progress will be lost. Use the Export feature if you need to retain your scenarios.
- **Missing Snapshot**: Snapshot comparisons are stored in local browser storage too, so clearing storage removes them.
- **Why One Answer Matters So Much**: That usually means the recommendation is sensitive and the engine sees that question as a strong tradeoff or eligibility signal.
- **Unexpected Recommendation**: Start with the decision trace and confidence banner in the main result, then use the raw trace and audit log if you need deeper engine detail.
