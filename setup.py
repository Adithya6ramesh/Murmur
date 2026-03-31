#!/usr/bin/env python3
"""
Murmur AI Voice Journaling App - Setup Script
"""
import os
import sys
import subprocess
import shutil
from pathlib import Path

def print_step(step, message):
    """Print a setup step"""
    print(f"\n🔧 Step {step}: {message}")
    print("-" * 50)

def check_python_version():
    """Check if Python version is compatible"""
    version = sys.version_info
    if version.major < 3 or (version.major == 3 and version.minor < 8):
        print("❌ Python 3.8+ is required")
        return False
    print(f"✅ Python {version.major}.{version.minor}.{version.micro} detected")
    return True

def create_virtual_environment():
    """Create and activate virtual environment"""
    if os.path.exists('venv'):
        print("✅ Virtual environment already exists")
        return True
    
    try:
        subprocess.run([sys.executable, '-m', 'venv', 'venv'], check=True)
        print("✅ Virtual environment created successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to create virtual environment: {e}")
        return False

def install_dependencies():
    """Install Python dependencies"""
    venv_python = 'venv\\Scripts\\python.exe' if os.name == 'nt' else 'venv/bin/python'
    
    if not os.path.exists(venv_python):
        print("❌ Virtual environment not found. Please create it first.")
        return False
    
    try:
        subprocess.run([venv_python, '-m', 'pip', 'install', '-r', 'requirements.txt'], check=True)
        print("✅ Dependencies installed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install dependencies: {e}")
        return False

def setup_environment_file():
    """Setup .env file from template"""
    if os.path.exists('.env'):
        print("✅ .env file already exists")
        return True
    
    try:
        shutil.copy('.env.example', '.env')
        print("✅ .env file created from template")
        print("⚠️  Please edit .env file with your configuration:")
        print("   - Add your GEMINI_API_KEY")
        print("   - Configure WHISPER_MODEL_PATH and WHISPER_EXECUTABLE_PATH")
        return True
    except Exception as e:
        print(f"❌ Failed to create .env file: {e}")
        return False

def create_directories():
    """Create necessary directories"""
    directories = ['uploads', 'logs', 'models']
    
    for directory in directories:
        Path(directory).mkdir(exist_ok=True)
        print(f"✅ Created directory: {directory}")
    
    return True

def check_whisper_setup():
    """Check Whisper.cpp setup"""
    print("\n🎵 Whisper.cpp Setup Check:")
    
    # Check if whisper.cpp directory exists
    if not os.path.exists('whisper.cpp'):
        print("❌ whisper.cpp directory not found")
        print("   Please clone and compile whisper.cpp:")
        print("   git clone https://github.com/ggerganov/whisper.cpp.git")
        print("   cd whisper.cpp && make")
        return False
    
    # Check if executable exists
    whisper_exe = 'whisper.cpp\\main.exe' if os.name == 'nt' else 'whisper.cpp/main'
    if not os.path.exists(whisper_exe):
        print(f"❌ Whisper executable not found: {whisper_exe}")
        print("   Please compile whisper.cpp: cd whisper.cpp && make")
        return False
    
    print(f"✅ Whisper executable found: {whisper_exe}")
    
    # Check if model exists
    if not os.path.exists('models/ggml-base.bin'):
        print("❌ Whisper model not found: models/ggml-base.bin")
        print("   Please download a model:")
        print("   cd whisper.cpp && bash ./models/download-ggml-model.sh base")
        print("   cp models/ggml-base.bin ../models/")
        return False
    
    print("✅ Whisper model found: models/ggml-base.bin")
    return True

def main():
    """Main setup function"""
    print("🎙️ Murmur AI Voice Journaling App - Setup")
    print("=" * 60)
    
    # Step 1: Check Python version
    print_step(1, "Checking Python version")
    if not check_python_version():
        return 1
    
    # Step 2: Create virtual environment
    print_step(2, "Setting up virtual environment")
    if not create_virtual_environment():
        return 1
    
    # Step 3: Install dependencies
    print_step(3, "Installing dependencies")
    if not install_dependencies():
        return 1
    
    # Step 4: Setup environment file
    print_step(4, "Setting up environment configuration")
    if not setup_environment_file():
        return 1
    
    # Step 5: Create directories
    print_step(5, "Creating necessary directories")
    if not create_directories():
        return 1
    
    # Step 6: Check Whisper setup
    print_step(6, "Checking Whisper.cpp setup")
    whisper_ok = check_whisper_setup()
    
    # Final summary
    print("\n" + "=" * 60)
    print("📋 Setup Summary:")
    print("✅ Python environment ready")
    print("✅ Dependencies installed")
    print("✅ Configuration files created")
    print("✅ Directories created")
    
    if whisper_ok:
        print("✅ Whisper.cpp ready")
        print("\n🎉 Setup completed successfully!")
        print("\n🚀 Next steps:")
        print("1. Edit .env file with your API keys")
        print("2. Run: python run.py")
        print("3. Test: python test_api.py")
    else:
        print("⚠️  Whisper.cpp needs setup")
        print("\n📝 Setup partially completed!")
        print("\n🔧 Next steps:")
        print("1. Setup Whisper.cpp (see instructions above)")
        print("2. Edit .env file with your API keys")
        print("3. Run: python run.py")
    
    return 0

if __name__ == "__main__":
    sys.exit(main())