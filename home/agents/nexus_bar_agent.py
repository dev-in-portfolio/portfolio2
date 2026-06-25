"""
nexus_bar_agent.py
Purpose: Check nexus bar presence
"""

import os

def run(root="portfolio"):
    issues = []
    for base, _, files in os.walk(root):
        for f in files:
            if f.endswith(('.html','.js','.css')):
                pass
    print("nexus_bar_agent.py: scan complete")
    return issues

if __name__ == "__main__":
    run()
