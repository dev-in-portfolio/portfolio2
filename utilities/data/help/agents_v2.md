# Agents Module - User Guide

Welcome to the Agents module! This cloud-hosted demo UI mirrors a local agent runtime where you can install packs, run agents with scoped permissions, and review receipts.

## Features
- **Store & Packs**: Browse and download agent bundles (13 packs, 161 agents available).
- **Runner**: A local execution environment for agents.
- **Receipts**: Every run generates comprehensive logs, timelines, and artifacts.
- **Demo Targets**: Pre-configured safe environments for the agents to operate on.
- **Policy**: Manage permissions and scopes for the agents.

## Step-by-Step Usage
1. **Browse Packs**: Navigate to the **Store** to explore available agent bundles.
2. **Install a Pack**: Select a pack to add it to your **Packs** library.
3. **Run an Agent**: Go to the **Runner** tab, select an installed agent, configure its permissions, and start the run.
4. **View Receipts**: Once a run completes, check the **Runs** tab to view the detailed receipt, including steps taken, generated artifacts, and redactions.

## Troubleshooting
- **Agent fails to run**: Check the **Policy** tab to ensure the agent has the necessary permissions.
- **Browser automation errors**: The demo only supports controlled targets. Ensure you are running agents against the predefined **Demo Targets**.
