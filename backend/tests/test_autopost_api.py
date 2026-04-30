"""
Backend API Tests for Autopost - AI-Powered Social Media Management Platform

Tests cover:
- Authentication (login, logout, me endpoint)
- Content Pipeline (start, get, list)
- Platforms (list)
- Ghost Reply (comments, reply)
- Secure Vault (keys)
- Agent Logs
- Brain Status
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@autopost.com"
ADMIN_PASSWORD = "admin123"


class TestHealth:
    """Health check endpoint tests"""
    
    def test_health_endpoint(self):
        """Test API health check"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["service"] == "autopost-api"
        print("✓ Health endpoint working")


class TestAuth:
    """Authentication endpoint tests"""
    
    def test_login_success(self):
        """Test successful login with admin credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "id" in data
        assert data["email"] == ADMIN_EMAIL
        assert data["role"] == "admin"
        assert isinstance(data["token"], str)
        assert len(data["token"]) > 0
        print(f"✓ Login successful for {ADMIN_EMAIL}")
    
    def test_login_invalid_credentials(self):
        """Test login with wrong password"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        print("✓ Invalid credentials rejected correctly")
    
    def test_login_nonexistent_user(self):
        """Test login with non-existent email"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "nonexistent@test.com",
            "password": "anypassword"
        })
        assert response.status_code == 401
        print("✓ Non-existent user rejected correctly")
    
    def test_me_endpoint_with_token(self):
        """Test /api/auth/me with valid token"""
        # First login
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        token = login_resp.json()["token"]
        
        # Then get me
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == ADMIN_EMAIL
        assert "password_hash" not in data  # Should not expose password
        print("✓ /api/auth/me returns user data correctly")
    
    def test_me_endpoint_without_token(self):
        """Test /api/auth/me without token"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401
        print("✓ /api/auth/me rejects unauthenticated requests")
    
    def test_logout(self):
        """Test logout endpoint"""
        response = requests.post(f"{BASE_URL}/api/auth/logout")
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Logged out"
        print("✓ Logout endpoint working")


class TestBrainStatus:
    """Brain status endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        self.token = login_resp.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_brain_status(self):
        """Test brain status endpoint"""
        response = requests.get(f"{BASE_URL}/api/brain/status", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert "message" in data
        assert data["status"] in ["idle", "active"]
        print(f"✓ Brain status: {data['status']} - {data['message']}")


class TestPlatforms:
    """Platform management endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        self.token = login_resp.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_platforms(self):
        """Test getting all platforms"""
        response = requests.get(f"{BASE_URL}/api/platforms", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 5  # 5 seeded platforms
        
        # Verify platform structure
        platform_slugs = [p["slug"] for p in data]
        assert "facebook" in platform_slugs
        assert "instagram" in platform_slugs
        assert "x" in platform_slugs
        assert "linkedin" in platform_slugs
        assert "tiktok" in platform_slugs
        
        # Verify platform data structure
        for platform in data:
            assert "name" in platform
            assert "slug" in platform
            assert "connected" in platform
            assert "health" in platform
            assert "last_post_metrics" in platform
            assert platform["health"] in ["healthy", "degraded", "disconnected"]
        
        print(f"✓ Got {len(data)} platforms with correct structure")
    
    def test_platforms_unauthorized(self):
        """Test platforms endpoint without auth"""
        response = requests.get(f"{BASE_URL}/api/platforms")
        assert response.status_code == 401
        print("✓ Platforms endpoint rejects unauthenticated requests")


class TestComments:
    """Ghost Reply comments endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        self.token = login_resp.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_comments(self):
        """Test getting all comments"""
        response = requests.get(f"{BASE_URL}/api/comments", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 6  # 6 seeded comments
        
        # Verify comment structure
        for comment in data:
            assert "id" in comment
            assert "platform" in comment
            assert "author" in comment
            assert "text" in comment
            assert "sentiment" in comment
            assert "suggested_reply" in comment
            assert "replied" in comment
            assert comment["sentiment"] in ["positive", "negative", "question"]
        
        print(f"✓ Got {len(data)} comments with correct structure")
    
    def test_reply_to_comment(self):
        """Test replying to a comment"""
        # First get comments
        comments_resp = requests.get(f"{BASE_URL}/api/comments", headers=self.headers)
        comments = comments_resp.json()
        
        # Find an unreplied comment
        unreplied = next((c for c in comments if not c["replied"]), None)
        if unreplied:
            comment_id = unreplied["id"]
            response = requests.post(f"{BASE_URL}/api/comments/{comment_id}/reply", 
                                    headers=self.headers)
            assert response.status_code == 200
            data = response.json()
            assert data["message"] == "Reply sent"
            
            # Verify the comment is now marked as replied
            comments_resp2 = requests.get(f"{BASE_URL}/api/comments", headers=self.headers)
            updated_comment = next((c for c in comments_resp2.json() if c["id"] == comment_id), None)
            assert updated_comment["replied"] == True
            print(f"✓ Successfully replied to comment {comment_id}")
        else:
            print("⚠ No unreplied comments found to test")
    
    def test_comments_unauthorized(self):
        """Test comments endpoint without auth"""
        response = requests.get(f"{BASE_URL}/api/comments")
        assert response.status_code == 401
        print("✓ Comments endpoint rejects unauthenticated requests")


class TestVault:
    """Secure Vault endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        self.token = login_resp.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_vault_keys(self):
        """Test getting vault keys"""
        response = requests.get(f"{BASE_URL}/api/vault/keys", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Got {len(data)} vault keys")
    
    def test_save_vault_key(self):
        """Test saving a vault key"""
        response = requests.post(f"{BASE_URL}/api/vault/keys", 
                                headers=self.headers,
                                json={
                                    "provider": "TEST_openai",
                                    "api_key": "sk-test-key-12345"
                                })
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "TEST_openai" in data["message"]
        
        # Verify key was saved (without exposing the actual key)
        keys_resp = requests.get(f"{BASE_URL}/api/vault/keys", headers=self.headers)
        keys = keys_resp.json()
        saved_key = next((k for k in keys if k["provider"] == "TEST_openai"), None)
        assert saved_key is not None
        assert "api_key" not in saved_key  # API key should not be returned
        print("✓ Vault key saved successfully")
    
    def test_vault_unauthorized(self):
        """Test vault endpoint without auth"""
        response = requests.get(f"{BASE_URL}/api/vault/keys")
        assert response.status_code == 401
        print("✓ Vault endpoint rejects unauthenticated requests")


class TestAgentLogs:
    """Agent logs endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        self.token = login_resp.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_agent_logs(self):
        """Test getting agent logs"""
        response = requests.get(f"{BASE_URL}/api/agent-logs", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # Verify log structure if logs exist
        if len(data) > 0:
            log = data[0]
            assert "id" in log
            assert "type" in log
            assert "message" in log
            assert "timestamp" in log
        
        print(f"✓ Got {len(data)} agent logs")
    
    def test_agent_logs_unauthorized(self):
        """Test agent logs endpoint without auth"""
        response = requests.get(f"{BASE_URL}/api/agent-logs")
        assert response.status_code == 401
        print("✓ Agent logs endpoint rejects unauthenticated requests")


class TestContentPipeline:
    """Content Pipeline endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        self.token = login_resp.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_start_pipeline(self):
        """Test starting a content pipeline"""
        response = requests.post(f"{BASE_URL}/api/pipeline/start",
                                headers=self.headers,
                                json={"niche": "TEST_AI_Tech_News"})
        assert response.status_code == 200
        data = response.json()
        assert "pipeline_id" in data
        assert data["status"] == "running"
        assert data["niche"] == "TEST_AI_Tech_News"
        self.pipeline_id = data["pipeline_id"]
        print(f"✓ Pipeline started: {data['pipeline_id']}")
        return data["pipeline_id"]
    
    def test_get_pipeline(self):
        """Test getting a specific pipeline"""
        # First start a pipeline
        start_resp = requests.post(f"{BASE_URL}/api/pipeline/start",
                                  headers=self.headers,
                                  json={"niche": "TEST_Get_Pipeline"})
        pipeline_id = start_resp.json()["pipeline_id"]
        
        # Then get it
        response = requests.get(f"{BASE_URL}/api/pipeline/{pipeline_id}", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert data["pipeline_id"] == pipeline_id
        assert "stages" in data
        assert "status" in data
        assert "niche" in data
        print(f"✓ Got pipeline {pipeline_id} with status: {data['status']}")
    
    def test_list_pipelines(self):
        """Test listing all pipelines"""
        response = requests.get(f"{BASE_URL}/api/pipelines", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # Verify pipeline structure if pipelines exist
        if len(data) > 0:
            pipeline = data[0]
            assert "pipeline_id" in pipeline
            assert "niche" in pipeline
            assert "status" in pipeline
            assert "stages" in pipeline
        
        print(f"✓ Got {len(data)} pipelines")
    
    def test_pipeline_not_found(self):
        """Test getting non-existent pipeline"""
        response = requests.get(f"{BASE_URL}/api/pipeline/nonexistent-id", headers=self.headers)
        assert response.status_code == 404
        print("✓ Non-existent pipeline returns 404")
    
    def test_pipeline_unauthorized(self):
        """Test pipeline endpoints without auth"""
        response = requests.get(f"{BASE_URL}/api/pipelines")
        assert response.status_code == 401
        print("✓ Pipeline endpoints reject unauthenticated requests")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
