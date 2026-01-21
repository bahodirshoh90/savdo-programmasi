#!/usr/bin/env python3
"""
Create help_requests table in database
"""
import sys
import os
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from database import engine, Base
from models import HelpRequest

def main():
    """Create help_requests table"""
    try:
        print("Creating help_requests table...")
        HelpRequest.__table__.create(engine, checkfirst=True)
        print("✅ help_requests table created successfully!")
        return 0
    except Exception as e:
        print(f"❌ Error creating table: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    raise SystemExit(main())
