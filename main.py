"""
Main FastAPI application for Inventory Management System.
"""
from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

import database as db
import business_logic as bl
import auth

# Initialize FastAPI app
app = FastAPI(title="Inventory Management System", version="1.0.0")

security = HTTPBearer()

# Mount static files and templates
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# Pydantic models
class Product(BaseModel):
    name: str
    price: float
    quantity: int
    batch: str
    expiry_date: str

class UserSignUp(BaseModel):
    email: str
    password:str

class UserSignIn(BaseModel):
    email: str
    password:str

# ========= AUTHENTICATION DEPENDENCY ==========
async def get_current_user_id(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Dependency to get current user ID from token"""
    token = credentials.credentials
    user_id = auth.verify_token(token)

    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    return user_id

# Initialize database on startup

@app.on_event("startup")
async def startup_event():
    """Initialize database when application starts."""
    db.init_db()
    print("✓ Database initialized")

# ========== WEB ROUTES ==========

@app.get("/", response_class=HTMLResponse)
def home(request: Request):
    """Serve the main HTML page."""
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/login", response_class=HTMLResponse)
def login_page(request: Request):
    """Serve the login page"""
    return templates.TemplateResponse("login.html", {"request": request})

@app.get("/register", response_class=HTMLResponse)
def register_page(request: Request):
    """Serve the register page"""
    return templates.TemplateResponse("register.html", {"request": request})

# ========== AUTH ENDPOINTS ==========

@app.post("/auth/signup")
async def signup(user: UserSignUp):
    """Register a new user"""
    result = await auth.sign_up(user.email, user.password)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result

@app.post("/auth/signin")
async def signin(user: UserSignIn):
    """Login a user"""
    result = await auth.sign_in(user.email, user.password)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result

@app.get("/auth/user")
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current logged-in user"""
    token = credentials.credentials
    print(f"DEBUG: Token recieved: {token[:30]}")

    result = await auth.get_user(token)
    
    print(f"DEBUG: Result: {result}")

    if "error" in result:
        raise HTTPException(status_code=401, detail=str(result))
    return result
# ========== PRODUCT ENDPOINTS ==========

@app.post("/products")
def create_product(product: Product, user_id: str = Depends(get_current_user_id)):
    """Create a new product."""
    return bl.add_product(
        product.name,
        product.price,
        product.quantity,
        product.batch,
        product.expiry_date,
        user_id
    )

@app.get("/products")
def get_products(user_id: str = Depends(get_current_user_id)):
    """Get all products."""
    return bl.view_products(user_id)

@app.get("/products/expiry")
def get_expiry_status(user_id: str = Depends(get_current_user_id)):
    """Get expiry status of all products."""
    return bl.check_expiry(user_id)

@app.delete("/products/{batch}")
def delete_product(batch: str, user_id: str = Depends(get_current_user_id)):
    """Delete a product by batch number."""
    return bl.remove_product(batch, user_id)

# ========== ORDER ENDPOINTS ==========

@app.post("/orders")
def create_order(batch: str, quantity: int, user_id: str = Depends(get_current_user_id)):
    """Create or update an order."""
    return bl.create_order(batch, quantity, user_id)

@app.get("/orders")
def get_orders(user_id: str = Depends(get_current_user_id)):
    """Get all orders."""
    return bl.view_orders(user_id)

@app.get("/orders/drafts")
def get_draft_orders(user_id: str = Depends(get_current_user_id)):
    """Get all draft orders."""
    return bl.view_draft_orders(user_id)

@app.put("/orders/{order_id}")
def update_order(order_id: str, quantity: int, user_id: str = Depends(get_current_user_id)):
    """Update order quantity."""
    return bl.update_order(order_id, quantity, user_id)

@app.post("/orders/{order_id}/confirm")
def confirm_order(order_id: str, user_id: str = Depends(get_current_user_id)):
    """Confirm a draft order."""
    return bl.confirm_order(order_id, user_id)

# ========== SUPPLIER ENDPOINTS ==========

@app.post("/supplier/recieve")
def receive_stock(batch: str, received_quantity: int, user_id: str = Depends(get_current_user_id)):
    """Receive stock from supplier."""
    return bl.receive_stock(batch, received_quantity, user_id)

# ========== HEALTH CHECK ==========

@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "inventory-management"}
