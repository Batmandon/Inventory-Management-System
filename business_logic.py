"""
Business logic module for inventory management.
Contains all the core business operations.
"""

from datetime import datetime
from fastapi import HTTPException
import database as db

def add_product(name, price, quantity, batch, expiry_date,user_id):
    """Add a new product to the inventory."""
    # Validation
    if quantity <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be greater than zero.")

    try:
        exp_date = datetime.strptime(expiry_date, '%Y-%m-%d').date()
    except ValueError:
        raise HTTPException(status_code=400, detail="expiry_date must be in YYYY-MM-DD format")

    if exp_date <= datetime.now().date():
        raise HTTPException(status_code=400, detail="Expiry date must be a future date.")
    
    # Insert product with user_id
    db.insert_product(name, price, quantity, batch, expiry_date, user_id)
    
    # Auto-create orders if needed
    auto_create_orders(user_id)
    
    return {"message": f"Product {name} added successfully."}

def check_expiry(user_id):
    """Check and returns the expiry status of products."""
    products = db.get_all_products(user_id)
    result = []
    
    for product in products:
        # Check if it"s already a date object or a string
        expiry_date = product['expiry_date']
        if isinstance(expiry_date, str):
            expiry_date = datetime.strptime(expiry_date, '%Y-%m-%d').date()

        days_left = (expiry_date - datetime.now().date()).days

        if days_left <= 0:
            status = "Expired" 
        elif days_left <= 7:
            status = "Critical"  
        elif days_left <= 30:
            status = "Warning"
        elif days_left > 30:
            status = "Safe"

        result.append({
            "name": product["name"],
            "batch": product["batch"],
            "days_left": days_left,
            "status": status
        })    

    return result

def view_products(user_id):
    """Get all products for a specific user."""
    return db.get_all_products(user_id)

def remove_product(batch, user_id):
    """Remove a product from the inventory by batch number."""
    success = db.delete_product(batch, user_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Batch number not found.")
    
    return f"Product with batch number {batch} has been removed."

def auto_create_orders(user_id):
    """Automatically create draft orders for low stock items."""
    products = db.get_all_products(user_id)
    
    for p in products:
        if p["quantity"] < 10:
            # Check if draft order already exists
            if not db.check_draft_order_exists(p["batch"], user_id):
                # Create new draft order
                order_count = db.get_order_count(user_id)
                order_id = f"ORD-{user_id[:8]}-{order_count + 1}"
                
                db.insert_order(
                    order_id=order_id,
                    batch=p["batch"],
                    product=p["name"],
                    requested_qty=10 - p["quantity"],
                    status="DRAFT",
                    created_at=datetime.now().strftime("%Y-%m-%d"),
                    user_id=user_id
                )

def create_order(batch, quantity, user_id):
    """Create or update an order."""
    orders = db.get_all_orders(user_id)
    
    # Check if draft order exists for this batch
    for o in orders:
        if o["batch"] == batch and o["status"] == "DRAFT":
            # Update existing draft
            db.update_order_quantity(o["order_id"], quantity, user_id)
            o["requested_qty"] = quantity
            return {"message": "Draft order updated", "order": o}
    
    # Create new order
    product = db.get_product_by_batch(batch, user_id)
    
    if not product:
        raise HTTPException(status_code=400, detail="Product not found")
    
    order_count = db.get_order_count(user_id)
    order_id = f"ORD-{user_id[:8]}-{order_count + 1}"
    
    db.insert_order(
        order_id=order_id,
        batch=batch,
        product=product["name"],
        requested_qty=quantity,
        status="DRAFT",
        created_at=datetime.now().strftime("%Y-%m-%d"),
        user_id=user_id
    )
    
    order = {
        "order_id": order_id,
        "batch": batch,
        "product": product["name"],
        "requested_qty": quantity,
        "status": "DRAFT",
        "created_at": datetime.now().strftime("%Y-%m-%d")
    }
    
    return {"message": "Draft order created", "order": order}

def view_orders(user_id):
    """Get all orders."""
    return db.get_all_orders(user_id)

def view_draft_orders(user_id):
    """Get all draft orders."""
    return db.get_draft_orders(user_id)

def receive_stock(batch, received_quantity, user_id):
    """Receive stock for a product."""
    if received_quantity <= 0:
        raise HTTPException(status_code=400, detail="Invalid quantity")
    
    product = db.get_product_by_batch(batch, user_id)
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    new_quantity = product['quantity'] + received_quantity
    db.update_product_quantity(batch, new_quantity, user_id)
    
    # Auto-create orders if needed
    auto_create_orders(user_id)
    
    return {
        "message": "Stock updated",
        "received": received_quantity,
        "current_stock": new_quantity
    }

def update_order(order_id, quantity, user_id):
    """Update order quantity."""
    success = db.update_order_quantity(order_id, quantity, user_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Order not found")
    
    order = db.get_order_by_id(order_id, user_id)
    return order

def confirm_order(order_id, user_id):
    """Confirm a draft order."""
    success = db.update_order_status(order_id, "CONFIRMED", user_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Order not found")
    
    order = db.get_order_by_id(order_id, user_id)
    return order
