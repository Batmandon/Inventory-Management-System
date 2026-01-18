import httpx
import os
from dotenv import load_dotenv
from fastapi import HTTPException

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")

async def sign_up(email: str, password: str):
    """Register a new user"""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{SUPABASE_URL}/auth/v1/signup",
            json={"email": email, "password": password},
            headers={
                "apikey":SUPABASE_ANON_KEY,
                "Content-Type": "application/json"
            }
        )
        return response.json()
    
async def sign_in(email: str, password: str):
    """Login a user"""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
            json={"email": email, "password": password},
            headers={
                "apikey":SUPABASE_ANON_KEY,
                "Content-Type": "application/json"
            }
        )
        return response.json()
    
async def get_user(access_token: str):
    """Get current user from token"""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{SUPABASE_URL}/auth/v1/user",
            headers={
                "apikey":SUPABASE_ANON_KEY,
                "Authorization": f"Bearer {access_token}"
            }
        )
        return response.json()
    
def verify_token(access_token: str):
    """Verify if token is valid and return user_id"""
    try:
        import httpx
        response = httpx.get(
            f"{SUPABASE_URL}/auth/v1/user",
            headers={
                "apikey":SUPABASE_ANON_KEY,
                "Authorization": f"Bearer {access_token}"
            }
        )
        if response.status_code == 200:
            user_data = response.json()
            return user_data.get("id")
        return None
    except:
        return None
    
