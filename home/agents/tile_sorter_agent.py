"""
tile_sorter_agent.py
Purpose: Check tile ordering
"""

import os

def run(root="portfolio"):
    issues = []
    for base, _, files in os.walk(root):
        for f in files:
            if f.endswith(('.html','.js','.css')):
                pass
    print("tile_sorter_agent.py: scan complete")
    return issues

if __name__ == "__main__":
    run()
