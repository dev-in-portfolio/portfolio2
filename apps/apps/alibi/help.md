# Alibi (Logged & Verified) - User Guide

Alibi is a kitchen inventory and margin control tool designed for real operating use. It tracks COGS, invoice intake, count drift, recipe cost, and the exceptions that can quietly break month-end numbers.

## Features
- **Dashboard**: View high-level stats plus a new Action Center, monthly trend view, and variance drivers instead of only static summary totals.
- **Counting**: Perform physical inventory counts efficiently.
- **Invoice Ingestion Workflow**: Each invoice now shows whether it needs review, is ready to post, or has already been posted into cost memory.
- **Recipes**: Manage kitchen recipes and ingredient usage.
- **Reports**: Generate financial and operational views for unmatched lines, findings, and COGS.
- **Quick Entry**: Rapidly log items you just bought or found.

## Step-by-Step Usage
1. **Dashboard Overview**: Start on the Dashboard to review this month's quick stats, then scan the **Action Center** for what changed, what is off target, and what still needs attention.
2. **Start Counting**: Click "Start Counting" on the dashboard or navigate to the **Counting** tab to input your current inventory levels.
3. **Enter Invoices**: Use the **Invoices** tab to add a new delivery. The invoice editor now shows ingestion status, blocker chips, matched-line counts, and missing cost signals before you post.
4. **Review and Post**: Fix unmatched lines or missing prices in the invoice editor, then use **Post to Purchases** once the invoice is clean.
5. **Manage Month**: Use the top right selector to switch between months or click "+ Month" to start a new period.
6. **Trend & Variance Review**: Use the Dashboard trend cards and the Reports trend/variance review panel to compare this month against recent periods and isolate the items driving movement.
7. **Data Backup**: Use the **Export** button to download a full JSON backup of your data, and **Import** to restore it.

## Troubleshooting
- **Data Not Saving**: The app auto-saves to your local browser storage. Ensure you are not in Incognito mode, or export your backup frequently.
- **Invoice Won't Post**: The ingestion panel will tell you what still blocks posting, such as missing vendor info, unmatched lines, or zero-cost lines.
- **Action Center Is Noisy**: That usually means invoices are still in review, unmatched lines are distorting spend, or COGS moved sharply vs the prior month. Use the linked Invoices and Reports surfaces to work from top to bottom.
