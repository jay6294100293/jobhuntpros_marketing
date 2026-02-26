import requests
import sys
import json
from datetime import datetime
import io
import os
from pathlib import Path

class JobHuntProAPITester:
    def __init__(self, base_url="https://ugc-creator-13.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None, timeout=30):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Accept': 'application/json'}
        
        # Don't set Content-Type for form data or file uploads
        if not files and method in ['POST', 'PUT'] and data:
            if isinstance(data, dict):
                headers['Content-Type'] = 'application/json'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=timeout)
            elif method == 'POST':
                if files:
                    # For file uploads or form data, don't set Content-Type header  
                    if 'Content-Type' in headers:
                        del headers['Content-Type']
                    response = requests.post(url, data=data, files=files, headers=headers, timeout=timeout)
                elif isinstance(data, dict) and not files:
                    response = requests.post(url, json=data, headers=headers, timeout=timeout)
                else:
                    response = requests.post(url, data=data, headers=headers, timeout=timeout)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json() if response.text else {}
                except:
                    return True, response.text
            else:
                self.failed_tests.append({
                    'test': name,
                    'expected': expected_status,
                    'actual': response.status_code,
                    'response': response.text[:200] if response.text else 'No response'
                })
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}...")
                return False, {}

        except Exception as e:
            self.failed_tests.append({
                'test': name,
                'error': str(e)
            })
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test the root API endpoint"""
        success, response = self.run_test(
            "Root API Endpoint",
            "GET",
            "",
            200
        )
        return success

    def test_url_scraping(self):
        """Test URL scraping functionality"""
        test_url = "https://www.github.com"  # Use a more reliable URL
        # This endpoint expects form data, not JSON
        success, response = self.run_test(
            "URL Scraping", 
            "POST",
            "scrape",
            200,
            data={"url": test_url},
            files={}  # Force form data handling
        )
        
        if success and response:
            required_fields = ['url', 'colors', 'headline', 'features', 'description']
            for field in required_fields:
                if field not in response:
                    print(f"⚠️  Warning: Missing field '{field}' in response")
                    return False
            print(f"   Extracted: {len(response.get('colors', []))} colors, {len(response.get('features', []))} features")
        
        return success

    def test_file_upload(self):
        """Test file upload functionality"""
        # Create a small test image file in memory
        from PIL import Image
        import io
        
        # Create a simple test image
        img = Image.new('RGB', (100, 100), color='red')
        img_buffer = io.BytesIO()
        img.save(img_buffer, format='PNG')
        img_buffer.seek(0)
        
        files = {
            'file': ('test_image.png', img_buffer, 'image/png')
        }
        data = {'file_type': 'image'}
        
        success, response = self.run_test(
            "File Upload",
            "POST",
            "upload",
            200,
            data=data,
            files=files
        )
        
        if success and response:
            required_fields = ['id', 'filename', 'path', 'type', 'size']
            for field in required_fields:
                if field not in response:
                    print(f"⚠️  Warning: Missing field '{field}' in upload response")
                    return False
        
        return success

    def test_script_generation(self):
        """Test AI script generation with GPT-4o"""
        script_request = {
            "framework": "PAS",
            "product_name": "JobHuntPro",
            "target_audience": "Job seekers",
            "key_features": ["Resume builder", "Job tracking", "Interview prep"]
        }
        
        success, response = self.run_test(
            "AI Script Generation (GPT-4o)",
            "POST",
            "generate-script",
            200,
            data=script_request,
            timeout=60  # AI generation might take longer
        )
        
        if success and response:
            required_fields = ['id', 'framework', 'content', 'product_name', 'created_at']
            for field in required_fields:
                if field not in response:
                    print(f"⚠️  Warning: Missing field '{field}' in script response")
                    return False
            
            if len(response.get('content', '')) < 50:
                print(f"⚠️  Warning: Generated script seems too short ({len(response.get('content', ''))} chars)")
            else:
                print(f"   Generated script: {len(response.get('content', ''))} characters")
        
        return success

    def test_poster_creation(self):
        """Test poster creation functionality"""
        poster_request = {
            "headline": "JobHuntPro",
            "subtext": "Land Your Dream Job",
            "brand_colors": ["#6366f1", "#8b5cf6", "#10b981"],
            "format": "1:1"
        }
        
        success, response = self.run_test(
            "Poster Creation (1:1)",
            "POST",
            "create-poster",
            200,
            data=poster_request
        )
        
        if success and response:
            required_fields = ['id', 'path', 'url', 'format']
            for field in required_fields:
                if field not in response:
                    print(f"⚠️  Warning: Missing field '{field}' in poster response")
                    return False
        
        # Test 9:16 format as well
        poster_request["format"] = "9:16"
        success2, response2 = self.run_test(
            "Poster Creation (9:16)",
            "POST",
            "create-poster",
            200,
            data=poster_request
        )
        
        return success and success2

    def test_video_creation(self):
        """Test video creation functionality"""
        data = {
            'video_type': 'tutorial',
            'format_type': '16:9',
            'script_text': 'This is a test video script for JobHuntPro',
            'image_paths': '[]'
        }
        
        success, response = self.run_test(
            "Video Creation (16:9)",
            "POST",
            "create-video",
            200,
            data=data,
            files={},  # Force form data handling
            timeout=60  # Video creation takes time
        )
        
        if success and response:
            required_fields = ['id', 'path', 'url', 'format']
            for field in required_fields:
                if field not in response:
                    print(f"⚠️  Warning: Missing field '{field}' in video response")
                    return False
        
        return success

    def test_magic_button(self):
        """Test the magic button functionality - the key feature"""
        magic_request = {
            "url": "https://www.github.com",  # Use a more reliable URL
            "product_name": "JobHuntPro",
            "target_audience": "Job seekers"
        }
        
        success, response = self.run_test(
            "Magic Button (Complete Launch Pack)",
            "POST",
            "magic-button",
            200,
            data=magic_request,
            timeout=90  # This combines multiple operations
        )
        
        if success and response:
            required_sections = ['brand_data', 'ad_script', 'tutorial_script', 'posters']
            for section in required_sections:
                if section not in response:
                    print(f"⚠️  Warning: Missing section '{section}' in magic button response")
                    return False
            
            # Check that we got 2 posters
            if len(response.get('posters', [])) != 2:
                print(f"⚠️  Warning: Expected 2 posters, got {len(response.get('posters', []))}")
            else:
                print(f"   Generated: 1 ad script, 1 tutorial script, {len(response['posters'])} posters")
        
        return success

    def test_voiceover_generation(self):
        """Test TTS voiceover generation (may fail gracefully if no credentials)"""
        voiceover_request = {
            "text": "This is a test voiceover for JobHuntPro",
            "voice_name": "en-US-Neural2-A",
            "speaking_rate": 1.0
        }
        
        success, response = self.run_test(
            "TTS Voiceover Generation",
            "POST",
            "generate-voiceover",
            200,
            data=voiceover_request
        )
        
        if not success:
            print("   Note: TTS may not have credentials configured - this is expected")
        
        return success

    def test_projects_endpoints(self):
        """Test project management endpoints"""
        # Get projects
        success1, _ = self.run_test(
            "Get Projects",
            "GET",
            "projects",
            200
        )
        
        # Create project - this endpoint expects form data
        success2, response = self.run_test(
            "Create Project",
            "POST",
            "projects",
            200,
            data={"name": f"Test Project {datetime.now().strftime('%H%M%S')}"},
            files={}  # Force form data handling
        )
        
        return success1 and success2

def main():
    print("🚀 Starting JobHuntPro Content Studio API Tests")
    print("=" * 60)
    
    tester = JobHuntProAPITester()
    
    # Test basic functionality first
    print("\n📡 Testing Basic Endpoints...")
    tester.test_root_endpoint()
    
    print("\n🌐 Testing URL Scraping...")
    tester.test_url_scraping()
    
    print("\n📁 Testing File Upload...")
    tester.test_file_upload()
    
    print("\n🤖 Testing AI Script Generation...")
    tester.test_script_generation()
    
    print("\n🖼️  Testing Poster Creation...")
    tester.test_poster_creation()
    
    print("\n🎬 Testing Video Creation...")
    tester.test_video_creation()
    
    print("\n✨ Testing Magic Button (Key Feature)...")
    tester.test_magic_button()
    
    print("\n🗂️  Testing Project Management...")
    tester.test_projects_endpoints()
    
    print("\n🔊 Testing TTS Voiceover...")
    tester.test_voiceover_generation()
    
    # Print final results
    print("\n" + "=" * 60)
    print(f"📊 Final Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    success_rate = (tester.tests_passed / tester.tests_run) * 100 if tester.tests_run > 0 else 0
    print(f"📈 Success Rate: {success_rate:.1f}%")
    
    if tester.failed_tests:
        print(f"\n❌ Failed Tests ({len(tester.failed_tests)}):")
        for i, failed in enumerate(tester.failed_tests, 1):
            print(f"  {i}. {failed.get('test', 'Unknown')}")
            if 'error' in failed:
                print(f"     Error: {failed['error']}")
            else:
                print(f"     Expected: {failed.get('expected')}, Got: {failed.get('actual')}")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())