"""
Passenger WSGI file for cPanel deployment
This file is used when cPanel uses Passenger (Phusion Passenger) to run Python apps
"""
import sys
import os

# Get the directory where this file is located
current_dir = os.path.dirname(os.path.abspath(__file__))

# Add the backend directory to Python path
sys.path.insert(0, current_dir)

# Change to the backend directory
os.chdir(current_dir)

# Debug: Print current directory and path
print(f"Passenger WSGI: Current directory: {current_dir}")
print(f"Passenger WSGI: Python path: {sys.path}")

# Import the FastAPI app
try:
    from main import app
    print("Passenger WSGI: FastAPI app imported successfully")
except Exception as e:
    print(f"Passenger WSGI: Error importing app: {e}")
    import traceback
    traceback.print_exc()
    raise

# For Passenger, we need to expose the application
application = app
