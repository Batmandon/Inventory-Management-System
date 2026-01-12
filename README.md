# Inventory Management System

A modern inventory management system built with FastAPI, SQLite, and vanilla JavaScript.

## Project Structure

```
inventory-management/
├── main.py                 # FastAPI application & routes
├── database.py            # Database operations (SQLite)
├── business_logic.py      # Business logic & validations
├── inventory.db           # SQLite database (auto-created)
├── templates/
│   └── index.html        # Frontend HTML
└── static/
    ├── styles.css        # CSS styling
    └── app.js            # JavaScript logic
```

## Architecture

### Separation of Concerns

1. **main.py** - Application Layer
   - FastAPI app configuration
   - Route definitions
   - Request/response handling
   - Pydantic models

2. **database.py** - Data Access Layer
   - SQLite connection management
   - CRUD operations
   - Database queries
   - Schema initialization

3. **business_logic.py** - Business Logic Layer
   - Validation rules
   - Business operations
   - Auto-order creation
   - Expiry checking

### Benefits of This Structure

✅ **Maintainability**: Each file has a single responsibility
✅ **Testability**: Easy to unit test each layer separately
✅ **Scalability**: Can easily switch database or add features
✅ **Readability**: Clear separation makes code easier to understand
✅ **Reusability**: Business logic can be reused across different endpoints

## Database Schema

### Products Table
```sql
CREATE TABLE products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    quantity INTEGER NOT NULL,
    batch TEXT UNIQUE NOT NULL,
    expiry_date TEXT NOT NULL
)
```

### Orders Table
```sql
CREATE TABLE orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT UNIQUE NOT NULL,
    batch TEXT NOT NULL,
    product TEXT NOT NULL,
    requested_qty INTEGER NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL
)
```

## Installation

1. Install dependencies:
```bash
pip install fastapi uvicorn
```

2. Run the application:
```bash
uvicorn main:app --reload
```

3. Access the application:
```
http://127.0.0.1:8000
```

## Features

- ✅ Product management (Add, View, Delete)
- ✅ Inventory tracking with batch numbers
- ✅ Expiry date monitoring (Expired, Critical, Warning, Safe)
- ✅ Auto-draft order creation for low stock (< 10 units)
- ✅ Order management (Create, Edit, Confirm)
- ✅ Stock receiving from suppliers
- ✅ SQLite database for data persistence
- ✅ Responsive minimalist UI

## API Endpoints

### Products
- `POST /products` - Create new product
- `GET /products` - Get all products
- `GET /products/expiry` - Get expiry status
- `DELETE /products/{batch}` - Delete product

### Orders
- `POST /orders` - Create/update order
- `GET /orders` - Get all orders
- `GET /orders/drafts` - Get draft orders
- `PUT /orders/{order_id}` - Update order quantity
- `POST /orders/{order_id}/confirm` - Confirm order

### Supplier
- `POST /supplier/recieve` - Receive stock

## Auto-Features

- **Auto-Draft Orders**: When product quantity < 10, draft order is automatically created
- **Auto-Expiry Check**: Products are automatically categorized by expiry status
- **Auto-Database Init**: Database and tables are created automatically on first run

## Future Enhancements

Possible improvements:
- Add user authentication
- Export reports (PDF/Excel)
- Email notifications for expiring products
- Barcode scanning
- Multi-warehouse support
- Analytics dashboard
