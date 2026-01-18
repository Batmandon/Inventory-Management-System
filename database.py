"""
Database module for inventory management system.
Handles all SQLite database operations.
"""

import psycopg2
from psycopg2.extras import RealDictCursor
from fastapi import HTTPException
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

def get_db_connection():
    """Get database connection."""
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)

def init_db():
    """Initialize database tables."""
    conn = get_db_connection()
    cursor = conn.cursor()
    # Droping existing tables (This will delete all data!)
    cursor.execute('DROP TABLE IF EXISTS orders')
    cursor.execute('DROP TABLE IF EXISTS products')

    # Create products table with user_id 
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS products (
            name TEXT NOT NULL,
            price REAL NOT NULL,
            quantity INTEGER NOT NULL,
            batch TEXT PRIMARY KEY,
            expiry_date TEXT NOT NULL,
            user_id TEXT NOT NULL  
        )
    ''')
    
    # Create orders table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS orders (
            order_id TEXT PRIMARY KEY,
            batch TEXT NOT NULL,
            product TEXT NOT NULL,
            requested_qty INTEGER NOT NULL,
            status TEXT NOT NULL,
            created_at TEXT NOT NULL,
            user_id TEXT NOT NULL
        )
    ''')
    
    conn.commit()
    conn.close()
# ========== PRODUCT OPERATIONS ==========

def get_all_products(user_id):
    """Load all products from database for a specific user."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT name, price, quantity, batch, expiry_date FROM products WHERE user_id = %s', (user_id,))
    products = cursor.fetchall()
    conn.close()
    return products

def get_product_by_batch(batch, user_id):
    """Get a single product by batch number for a specific user."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM products WHERE batch = %s AND user_id = %s', (batch, user_id,))
    product = cursor.fetchone()
    conn.close()
    return product



def insert_product(name, price, quantity, batch, expiry_date, user_id):
    """Insert a new product into the database."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            INSERT INTO products (name, price, quantity, batch, expiry_date, user_id)
            VALUES (%s, %s, %s, %s, %s, %s)
        ''', (name, price, quantity, batch, expiry_date, user_id))
        conn.commit()
        conn.close()
        return True
    except psycopg2.IntegrityError:
        conn.rollback()
        conn.close()
        raise HTTPException(
            status_code=400,
            detail="Batch number already exists"
        )

def update_product_quantity(batch, new_quantity, user_id):
    """Update product quantity."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('UPDATE products SET quantity = %s WHERE batch = %s AND user_id = %s', (new_quantity, batch, user_id))
    rows_affected = cursor.rowcount
    conn.commit()
    conn.close()
    return rows_affected > 0


def delete_product(batch, user_id):
    """Delete a product by batch number for a specific user."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM products WHERE batch = %s AND user_id = %s', (batch,user_id))
    rows_affected = cursor.rowcount
    conn.commit()
    conn.close()
    return rows_affected > 0

# ========== ORDER OPERATIONS ==========

def get_all_orders(user_id):
    """Load all orders from database for a specific user."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT order_id, batch, product, requested_qty, status, created_at FROM orders WHERE user_id = %s', (user_id,))
    rows = cursor.fetchall()
    conn.close()
    
    orders = []
    for row in rows:
        orders.append({
            'order_id': row['order_id'],
            'batch': row['batch'],
            'product': row['product'],
            'requested_qty': int(row['requested_qty']),
            'status': row['status'],
            'created_at': row['created_at']
        })
    return orders

def get_draft_orders(user_id):
    """Get all draft orders for a specific user."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT order_id, batch, product, requested_qty, status, created_at FROM orders WHERE status = %s AND user_id = %s', ("DRAFT",user_id))
    rows = cursor.fetchall()
    conn.close()
    
    orders = []
    for row in rows:
        orders.append({
            'order_id': row['order_id'],
            'batch': row['batch'],
            'product': row['product'],
            'requested_qty': int(row['requested_qty']),
            'status': row['status'],
            'created_at': row['created_at']
        })
    return orders

def get_order_by_id(order_id, user_id):
    """Get an order by ID for a specific user."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM orders WHERE order_id = %s And user_id = %s', (order_id,user_id))
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        return None
    
    return {
        'order_id': row['order_id'],
        'batch': row['batch'],
        'product': row['product'],
        'requested_qty': int(row['requested_qty']),
        'status': row['status'],
        'created_at': row['created_at']
    }

def check_draft_order_exists(batch, user_id):
    """Check if a draft order exists for a batch for a specific user."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT COUNT(*) as count FROM orders WHERE batch = %s AND status = %s AND user_id = %s', (batch, "DRAFT", user_id))
    count = cursor.fetchone()['count']
    conn.close()
    return count > 0

def insert_order(order_id, batch, product, requested_qty, status, created_at, user_id):
    """Insert a new order."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            INSERT INTO orders (order_id, batch, product, requested_qty, status, created_at, user_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        ''', (order_id, batch, product, requested_qty, status, created_at, user_id))
        conn.commit()
        conn.close()
        return True
    except psycopg2.IntegrityError:
        conn.rollback()
        conn.close()
        raise HTTPException(status_code=400, detail="Order ID already exists.")

def update_order_quantity(order_id, quantity, user_id):
    """Update order quantity fr a specific user."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('UPDATE orders SET requested_qty = %s WHERE order_id = %s AND user_id = %s', (quantity, order_id, user_id))
    rows_affected = cursor.rowcount
    conn.commit()
    conn.close()
    return rows_affected > 0

def update_order_status(order_id, status, user_id):
    """Update order status for a specific user."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('UPDATE orders SET status = %s WHERE order_id = %s AND user_id = %s', (status, order_id, user_id))
    rows_affected = cursor.rowcount
    conn.commit()
    conn.close()
    return rows_affected > 0

def get_order_count(user_id):
    """Get total number of orders for a specific user."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT COUNT(*) as count FROM orders WHERE user_id = %s', (user_id,))
    count = cursor.fetchone()['count']
    conn.close()
    return count
