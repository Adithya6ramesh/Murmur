#!/usr/bin/env python3
"""
Simple test script for Murmur API endpoints
"""
import requests
import json
import sys
import os

def test_health_check(base_url):
    """Test the health check endpoint"""
    print("🔍 Testing health check...")
    try:
        response = requests.get(f"{base_url}/api/v1/health")
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Health check failed: {str(e)}")
        return False

def test_api_info(base_url):
    """Test the API info endpoint"""
    print("\n📋 Testing API info...")
    try:
        response = requests.get(f"{base_url}/api/v1/info")
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ API info failed: {str(e)}")
        return False

def test_audio_upload(base_url, audio_file_path):
    """Test audio upload and analysis"""
    print(f"\n🎵 Testing audio upload with: {audio_file_path}")
    
    if not os.path.exists(audio_file_path):
        print(f"❌ Audio file not found: {audio_file_path}")
        return False
    
    try:
        with open(audio_file_path, 'rb') as f:
            files = {'audio': f}
            response = requests.post(f"{base_url}/api/v1/journal/analyze", files=files)
        
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Upload successful!")
            print(f"Transcript: {data['data']['transcript'][:100]}...")
            print(f"Analysis keys: {list(data['data']['analysis'].keys())}")
        else:
            print(f"❌ Upload failed: {response.text}")
        
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Audio upload failed: {str(e)}")
        return False

def test_transcript_only(base_url, audio_file_path):
    """Test transcription-only endpoint"""
    print(f"\n📝 Testing transcription only with: {audio_file_path}")
    
    if not os.path.exists(audio_file_path):
        print(f"❌ Audio file not found: {audio_file_path}")
        return False
    
    try:
        with open(audio_file_path, 'rb') as f:
            files = {'audio': f}
            response = requests.post(f"{base_url}/api/v1/journal/transcript-only", files=files)
        
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Transcription successful!")
            print(f"Transcript: {data['data']['transcript']}")
        else:
            print(f"❌ Transcription failed: {response.text}")
        
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Transcription failed: {str(e)}")
        return False

def main():
    """Main test function"""
    base_url = "http://localhost:5001"
    
    if len(sys.argv) > 1:
        base_url = sys.argv[1]
    
    print(f"🧪 Testing Murmur API at: {base_url}")
    print("=" * 50)
    
    # Test basic endpoints
    health_ok = test_health_check(base_url)
    info_ok = test_api_info(base_url)
    
    # Test audio upload if file provided
    audio_file = None
    if len(sys.argv) > 2:
        audio_file = sys.argv[2]
    
    if audio_file:
        analyze_ok = test_audio_upload(base_url, audio_file)
        transcript_ok = test_transcript_only(base_url, audio_file)
    else:
        print("\n💡 To test audio endpoints, provide an audio file:")
        print(f"   python {sys.argv[0]} {base_url} path/to/audio.wav")
        analyze_ok = True
        transcript_ok = True
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 Test Summary:")
    print(f"   Health Check: {'✅' if health_ok else '❌'}")
    print(f"   API Info: {'✅' if info_ok else '❌'}")
    if audio_file:
        print(f"   Audio Analysis: {'✅' if analyze_ok else '❌'}")
        print(f"   Transcription: {'✅' if transcript_ok else '❌'}")
    
    all_passed = health_ok and info_ok and analyze_ok and transcript_ok
    print(f"\n🎯 Overall: {'All tests passed! 🎉' if all_passed else 'Some tests failed 😞'}")
    
    return 0 if all_passed else 1

if __name__ == "__main__":
    sys.exit(main())