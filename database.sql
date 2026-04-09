CREATE TABLE company (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE,
    name VARCHAR(150) NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(100),
    logo TEXT,
    website VARCHAR(100),
    status VARCHAR(1) DEFAULT 'A' CHECK (status IN ('A','I')),
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE branch (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE, 
    company_id INT REFERENCES company(id),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50),
    address TEXT,
    phone VARCHAR(20),
    status VARCHAR(1) DEFAULT 'A' CHECK (status IN ('A','I')),
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE role (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE, 
    name VARCHAR(50) NOT NULL,
    description TEXT,
    access JSONB,
    status VARCHAR(1) DEFAULT 'A' CHECK (status IN ('A','I')),
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE, 
    branch_id INT REFERENCES branch(id),
    username VARCHAR(50) UNIQUE NOT NULL,
    phone VARCHAR(15) UNIQUE NOT NULL,
    address VARCHAR(100) UNIQUE NOT NULL,
    image TEXT,
    password_hash TEXT NOT NULL,
    role_id INT REFERENCES role(id),
    status VARCHAR(1) DEFAULT 'A' CHECK (status IN ('A','I')),
    created_by INT REFERENCES users(id),    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INT REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE party (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE, 
    branch_id INT REFERENCES branch(id),
    type VARCHAR(20) CHECK (type IN ('CUSTOMER','SUPPLIER')),
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(100),
    address TEXT,
    credit_limit DECIMAL(12,2) DEFAULT 0,
    loyalty_points INT DEFAULT 0,
    status VARCHAR(1) DEFAULT 'A' CHECK (status IN ('A','I')),
    created_by INT REFERENCES users(id),    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INT REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE category (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE,
    parent_id INT REFERENCES category(id),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(120) NOT NULL,
    image TEXT,
    status VARCHAR(1) DEFAULT 'A' CHECK (status IN ('A','I')),
    created_by INT REFERENCES users(id),    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INT REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE uom (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE, 
    name VARCHAR(50) NOT NULL,   
    symbol VARCHAR(10),          
    description TEXT,
    status VARCHAR(1) DEFAULT 'A' CHECK (status IN ('A','I')),
    created_by INT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INT REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE product (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE,
    uom_id INT REFERENCES uom(id),
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(200) NOT NULL,
    description TEXT,
    cost_price DECIMAL(12,2) NOT NULL,
    selling_price DECIMAL(12,2) NOT NULL,
    regular_price DECIMAL(12,2) NOT NULL,
    status VARCHAR(1) DEFAULT 'A' CHECK (status IN ('A','I')),
    created_by INT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INT REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE product_categories (
    id SERIAL PRIMARY KEY,
    product_id INT REFERENCES product(id) ON DELETE CASCADE,
    category_id INT REFERENCES category(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT FALSE,
    created_by INT REFERENCES users(id),  
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (product_id, category_id)
);

CREATE TABLE product_variant (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE, 
    product_id INT REFERENCES product(id) ON DELETE CASCADE,
    name VARCHAR(50), 
    weight DECIMAL(10,3),
    sku VARCHAR(100) UNIQUE, 
    weight_unit VARCHAR(10) DEFAULT 'kg',
    is_replaceable BOOLEAN DEFAULT FALSE, 
    additional_price DECIMAL(12,2) DEFAULT 0,
    status VARCHAR(1) DEFAULT 'A' CHECK (status IN ('A','I')),
    created_by INT REFERENCES users(id),    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INT REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE product_image (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE, 
    product_variant_id INT REFERENCES product_variant(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    alt_text VARCHAR(255),          
    is_primary BOOLEAN DEFAULT FALSE,
    status VARCHAR(1) DEFAULT 'A' CHECK (status IN ('A','I')), 
    created_by INT REFERENCES users(id),      
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INT REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE product_barcode (
    id SERIAL PRIMARY KEY,
    product_variant_id INT REFERENCES product_variant(id) ON DELETE CASCADE, 
    barcode VARCHAR(50) UNIQUE NOT NULL,
    type VARCHAR(20) DEFAULT 'EAN13' CHECK (type IN ('EAN13','CODE128','QR','UPC')), 
    is_primary BOOLEAN DEFAULT FALSE,
    status VARCHAR(1) DEFAULT 'A' CHECK (status IN ('A','I')), 
    created_by INT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INT REFERENCES users(id),     
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE product_enquiries (
  id            SERIAL PRIMARY KEY,
  product_id    INTEGER       NOT NULL,
  name          VARCHAR(150)  NOT NULL,
  phone         VARCHAR(20)   NOT NULL,
  email         VARCHAR(255),
  quantity      INTEGER       NOT NULL DEFAULT 1,
  message       TEXT          NOT NULL,
  status        VARCHAR(20)   NOT NULL DEFAULT 'pending',  -- pending | read | replied | closed
  created_at    TIMESTAMP     NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP     NOT NULL DEFAULT NOW()
);
CREATE TABLE uom_conversion (   
    id SERIAL PRIMARY KEY,
    product_id INT REFERENCES product(id) ON DELETE CASCADE,
    from_uom_id INT REFERENCES uom(id),
    to_uom_id INT REFERENCES uom(id),
    conversion_factor DECIMAL(12,4) NOT NULL CHECK (conversion_factor > 0),
    created_by INT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE purchase_order (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE,
    branch_id INT REFERENCES branch(id),
    supplier_id INT REFERENCES party(id),
    order_date DATE DEFAULT CURRENT_DATE,
    expected_date DATE,
    delivery_date DATE,
    total_amount DECIMAL(12,2) DEFAULT 0,
    tax_amount DECIMAL(12,2) DEFAULT 0,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    net_amount DECIMAL(12,2) GENERATED ALWAYS AS (total_amount + tax_amount - discount_amount) STORED,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING','PARTIAL','RECEIVED','CANCELLED','CLOSED')),
    notes TEXT,
    created_by INT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE purchase_order_items (
    id SERIAL PRIMARY KEY,
    order_id INT REFERENCES purchase_order(id) ON DELETE CASCADE,
    product_variant_id INT REFERENCES product_variant(id),
    quantity DECIMAL(12,2) NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL,
    discount DECIMAL(12,2) DEFAULT 0,
    tax_rate DECIMAL(5,2) DEFAULT 0,
    received_quantity DECIMAL(12,2) DEFAULT 0,
    subtotal DECIMAL(12,2) GENERATED ALWAYS AS ((quantity * unit_price) - discount) STORED,
    notes TEXT
);
CREATE TABLE goods_received_note (
    id SERIAL PRIMARY KEY,
    purchase_order_id INT REFERENCES purchase_order(id) ON DELETE CASCADE,
    code VARCHAR(20) UNIQUE,
    received_date DATE DEFAULT CURRENT_DATE,
    received_by INT REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'Pending' CHECK (status IN ('Pending','Partially','Received','Completed','Cancelled')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE grn_items (
    id SERIAL PRIMARY KEY,
    grn_id INT REFERENCES goods_received_note(id) ON DELETE CASCADE,
    product_variant_id INT REFERENCES product_variant(id),
    ordered_quantity DECIMAL(12,2) NOT NULL,
    received_quantity DECIMAL(12,2) NOT NULL,
    discrepancy DECIMAL(12,2) GENERATED ALWAYS AS (ordered_quantity - received_quantity) STORED,
    notes TEXT
);

CREATE TABLE inventory_stock (
    id SERIAL PRIMARY KEY,
    branch_id INT REFERENCES branch(id),
    product_variant_id INT REFERENCES product_variant(id),
    quantity DECIMAL(12,2) DEFAULT 0,
    UNIQUE (branch_id, product_variant_id)
);
CREATE TABLE stock_transaction (
    id SERIAL PRIMARY KEY,
    branch_id INT REFERENCES branch(id),
    product_variant_id INT REFERENCES product_variant(id),
    type VARCHAR(20) CHECK (type IN ('PURCHASE','SALE','TRANSFER','ADJUSTMENT','RETURN')),
    reference_id INT,
    quantity DECIMAL(12,2) NOT NULL,
    direction VARCHAR(3) CHECK (direction IN ('IN','OUT')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE requisition (
  id SERIAL PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL, 
  from_branch_id INT NOT NULL REFERENCES branch(id),
  to_branch_id INT NOT NULL REFERENCES branch(id),
  requisition_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED','COMPLETED')),
  remarks TEXT,
  approve_by INT REFERENCES users(id),
  created_by INT NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by INT REFERENCES users(id),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE requisition_items (
  id SERIAL PRIMARY KEY,
  requisition_id INT NOT NULL REFERENCES requisition(id) ON DELETE CASCADE,
  product_variant_id INT NOT NULL REFERENCES product_variant(id),
  requested_qty NUMERIC(12,2) NOT NULL CHECK (requested_qty >= 0),
  approved_qty NUMERIC(12,2) CHECK (approved_qty >= 0),
  remarks TEXT
);

CREATE TABLE product_transfer (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL, 
    from_branch_id INT REFERENCES branch(id),
    to_branch_id INT REFERENCES branch(id),
    transfer_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    type VARCHAR(50) NULL,
    reference_id VARCHAR(20) NULL,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING','RECEIVED','CANCELLED')),
    created_by INT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE product_transfer_items (
    id SERIAL PRIMARY KEY,
    transfer_id INT REFERENCES product_transfer(id) ON DELETE CASCADE,
    product_variant_id INT REFERENCES product_variant(id),
    quantity DECIMAL(12,2) NOT NULL
);
CREATE TABLE invoice (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE, 
    branch_id INT REFERENCES branch(id),
    party_id INT REFERENCES party(id), 
    type VARCHAR(20) CHECK (type IN ('SALE','PURCHASE','EXPENSE')),
    invoice_date DATE DEFAULT CURRENT_DATE,
    discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    tax_amount      DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL,
    paid_amount DECIMAL(12,2) DEFAULT 0,
    due_amount DECIMAL(12,2) GENERATED ALWAYS AS (total_amount - paid_amount) STORED,
    status VARCHAR(10) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','DUE','PARTIAL','PAID','CANCELLED')),
    created_by INT NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INT REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_invoice_paid_not_over  CHECK (paid_amount   <= total_amount),
    CONSTRAINT chk_invoice_total_positive CHECK (total_amount  >= 0),
    CONSTRAINT chk_invoice_discount       CHECK (discount_amount >= 0),
    CONSTRAINT chk_invoice_tax            CHECK (tax_amount    >= 0)
);

CREATE TABLE invoice_items (
    id SERIAL PRIMARY KEY,
    invoice_id INT REFERENCES invoice(id) ON DELETE CASCADE,
    product_variant_id INT REFERENCES product_variant(id),
    quantity DECIMAL(12,2) NOT NULL,
    cost_price DECIMAL(12,2) NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL,
    discount DECIMAL(12,2) DEFAULT 0,
    subtotal DECIMAL(12,2) GENERATED ALWAYS AS ((quantity * unit_price) - discount) STORED,
    CONSTRAINT chk_item_qty_positive   CHECK (quantity   > 0),
    CONSTRAINT chk_item_price_positive CHECK (unit_price >= 0),
    CONSTRAINT chk_item_discount       CHECK (discount   >= 0)
);

CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    invoice_id INT NOT NULL REFERENCES invoice(id) ON DELETE CASCADE,
    account_id INT NOT NULL REFERENCES account(id),
    method VARCHAR(20) CHECK (method IN ('CASH','CARD','BANK','MOBILE','ONLINE','COD')),
    amount DECIMAL(12,2) NOT NULL,
    payment_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reference_no VARCHAR(50),
    created_by INT NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by INT REFERENCES users(id),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- CREATE TABLE account_head (
--     id SERIAL PRIMARY KEY,
--     code VARCHAR(20) NOT NULL,
--     name VARCHAR(100) NOT NULL,
--     type VARCHAR(20) CHECK (type IN ('ASSET','LIABILITY','INCOME','EXPENSE','EQUITY')),
--     parent_id INT REFERENCES account_head(id),
--     status CHAR(1) DEFAULT 'A',
--     created_by INT NOT NULL REFERENCES users(id),
--   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--   updated_by INT REFERENCES users(id),
--   updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );
-- CREATE TABLE account (
--     id SERIAL PRIMARY KEY,
--     branch_id INT REFERENCES branch(id),
--     head_id INT REFERENCES account_head(id),
--     code VARCHAR(30) UNIQUE NOT NULL,
--     name VARCHAR(100) NOT NULL,
--     account_no VARCHAR(50),
--     opening_balance NUMERIC(14,2) DEFAULT 0,
--     opening_balance_type VARCHAR(6) CHECK (opening_balance_type IN ('DEBIT','CREDIT')),
--     status CHAR(1) DEFAULT 'A',
--     created_by INT NOT NULL REFERENCES users(id),
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--     updated_by INT REFERENCES users(id),
--     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- CREATE TABLE accounting_period (
--     id SERIAL PRIMARY KEY,
--     start_date DATE NOT NULL,
--     end_date DATE NOT NULL,
--     is_closed BOOLEAN DEFAULT FALSE,
--     created_by INT NOT NULL REFERENCES users(id),
--   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--   updated_by INT REFERENCES users(id),
--   updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );
-- CREATE TABLE journal_entry (
--     id SERIAL PRIMARY KEY,
--     branch_id INT REFERENCES branch(id),
--     entry_no VARCHAR(30) UNIQUE NOT NULL,
--     entry_date DATE NOT NULL,
--     period_id INT REFERENCES accounting_period(id),
--     source_module VARCHAR(30), 
--     source_id INT,
--     narration TEXT,
--    created_by INT NOT NULL REFERENCES users(id),
--   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--   updated_by INT REFERENCES users(id),
--   updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );
-- CREATE TABLE journal_line (
--     id SERIAL PRIMARY KEY,
--     journal_entry_id INT REFERENCES journal_entry(id) ON DELETE CASCADE,
--     account_id INT REFERENCES account(id),
--     debit NUMERIC(14,2) DEFAULT 0,
--     credit NUMERIC(14,2) DEFAULT 0,
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--     CHECK (debit >= 0 AND credit >= 0),
--     CHECK (debit = 0 OR credit = 0)
-- );
CREATE TABLE account_head (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL, 
    -- ASSET, LIABILITY, EQUITY, INCOME, EXPENSE
    parent_id INT REFERENCES account_head(id),
    is_group BOOLEAN DEFAULT FALSE,
    status CHAR(1) DEFAULT 'A' CHECK (status IN ('A','I')),
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INT,
    updated_at TIMESTAMP
);
INSERT INTO account_head (code, name, type, parent_id, status, created_by) VALUES
('1000', 'Assets',      'ASSET',     NULL, 'A', 1),
('2000', 'Liabilities', 'LIABILITY', NULL, 'A', 1),
('3000', 'Equity',      'EQUITY',    NULL, 'A', 1),
('4000', 'Income',      'INCOME',    NULL, 'A', 1),
('5000', 'Expenses',    'EXPENSE',   NULL, 'A', 1);

INSERT INTO account_head (code, name, type, parent_id, status, created_by) VALUES
('1100', 'Current Assets',        'ASSET',     (SELECT id FROM account_head WHERE code = '1000'), 'A', 1),
('1200', 'Fixed Assets',          'ASSET',     (SELECT id FROM account_head WHERE code = '1000'), 'A', 1),
('1300', 'Other Assets',          'ASSET',     (SELECT id FROM account_head WHERE code = '1000'), 'A', 1),
('2100', 'Current Liabilities',   'LIABILITY', (SELECT id FROM account_head WHERE code = '2000'), 'A', 1),
('2200', 'Long-Term Liabilities', 'LIABILITY', (SELECT id FROM account_head WHERE code = '2000'), 'A', 1),
('3100', 'Owner Equity',          'EQUITY',    (SELECT id FROM account_head WHERE code = '3000'), 'A', 1),
('3200', 'Retained Earnings',     'EQUITY',    (SELECT id FROM account_head WHERE code = '3000'), 'A', 1),
('4100', 'Sales Revenue',         'INCOME',    (SELECT id FROM account_head WHERE code = '4000'), 'A', 1),
('4200', 'Other Income',          'INCOME',    (SELECT id FROM account_head WHERE code = '4000'), 'A', 1),
('5100', 'Cost of Goods Sold',    'EXPENSE',   (SELECT id FROM account_head WHERE code = '5000'), 'A', 1),
('5200', 'Operating Expenses',    'EXPENSE',   (SELECT id FROM account_head WHERE code = '5000'), 'A', 1),
('5300', 'Payroll Expenses',      'EXPENSE',   (SELECT id FROM account_head WHERE code = '5000'), 'A', 1),
('5400', 'Financial Expenses',    'EXPENSE',   (SELECT id FROM account_head WHERE code = '5000'), 'A', 1),
('5500', 'Other Expenses',        'EXPENSE',   (SELECT id FROM account_head WHERE code = '5000'), 'A', 1);
 
-- ── BATCH 3: Leaves (parent = sub-group) ─────────────────────────
 
-- Current Assets
INSERT INTO account_head (code, name, type, parent_id, status, created_by) VALUES
('1110', 'Cash & Cash Equivalents', 'ASSET', (SELECT id FROM account_head WHERE code = '1100'), 'A', 1),
('1120', 'Bank Accounts',           'ASSET', (SELECT id FROM account_head WHERE code = '1100'), 'A', 1),
('1130', 'Mobile Banking',          'ASSET', (SELECT id FROM account_head WHERE code = '1100'), 'A', 1),
('1140', 'Accounts Receivable',     'ASSET', (SELECT id FROM account_head WHERE code = '1100'), 'A', 1),
('1150', 'Inventory',               'ASSET', (SELECT id FROM account_head WHERE code = '1100'), 'A', 1),
('1160', 'Advance & Deposits',      'ASSET', (SELECT id FROM account_head WHERE code = '1100'), 'A', 1),
('1170', 'Prepaid Expenses',        'ASSET', (SELECT id FROM account_head WHERE code = '1100'), 'A', 1);
 
-- Fixed Assets
INSERT INTO account_head (code, name, type, parent_id, status, created_by) VALUES
('1210', 'Furniture & Fixtures',     'ASSET', (SELECT id FROM account_head WHERE code = '1200'), 'A', 1),
('1220', 'Equipment & Machinery',    'ASSET', (SELECT id FROM account_head WHERE code = '1200'), 'A', 1),
('1230', 'Computer & Technology',    'ASSET', (SELECT id FROM account_head WHERE code = '1200'), 'A', 1),
('1240', 'Vehicles',                 'ASSET', (SELECT id FROM account_head WHERE code = '1200'), 'A', 1),
('1250', 'Accumulated Depreciation', 'ASSET', (SELECT id FROM account_head WHERE code = '1200'), 'A', 1);
 
-- Current Liabilities
INSERT INTO account_head (code, name, type, parent_id, status, created_by) VALUES
('2110', 'Accounts Payable',       'LIABILITY', (SELECT id FROM account_head WHERE code = '2100'), 'A', 1),
('2120', 'Tax Payable',            'LIABILITY', (SELECT id FROM account_head WHERE code = '2100'), 'A', 1),
('2130', 'VAT Payable',            'LIABILITY', (SELECT id FROM account_head WHERE code = '2100'), 'A', 1),
('2140', 'Salary & Wages Payable', 'LIABILITY', (SELECT id FROM account_head WHERE code = '2100'), 'A', 1),
('2150', 'Advance from Customers', 'LIABILITY', (SELECT id FROM account_head WHERE code = '2100'), 'A', 1),
('2160', 'Short-Term Loans',       'LIABILITY', (SELECT id FROM account_head WHERE code = '2100'), 'A', 1);
 
-- Long-Term Liabilities
INSERT INTO account_head (code, name, type, parent_id, status, created_by) VALUES
('2210', 'Long-Term Bank Loan', 'LIABILITY', (SELECT id FROM account_head WHERE code = '2200'), 'A', 1),
('2220', 'Deferred Revenue',    'LIABILITY', (SELECT id FROM account_head WHERE code = '2200'), 'A', 1);
 
-- Equity
INSERT INTO account_head (code, name, type, parent_id, status, created_by) VALUES
('3110', 'Owner Capital',                  'EQUITY', (SELECT id FROM account_head WHERE code = '3100'), 'A', 1),
('3120', 'Owner Drawings',                 'EQUITY', (SELECT id FROM account_head WHERE code = '3100'), 'A', 1),
('3210', 'Retained Earnings - Prior Years','EQUITY', (SELECT id FROM account_head WHERE code = '3200'), 'A', 1),
('3220', 'Current Year Profit / Loss',     'EQUITY', (SELECT id FROM account_head WHERE code = '3200'), 'A', 1);
 
-- Sales Revenue
INSERT INTO account_head (code, name, type, parent_id, status, created_by) VALUES
('4110', 'POS Sales Revenue',    'INCOME', (SELECT id FROM account_head WHERE code = '4100'), 'A', 1),
('4120', 'Online Sales Revenue', 'INCOME', (SELECT id FROM account_head WHERE code = '4100'), 'A', 1),
('4130', 'Service Revenue',      'INCOME', (SELECT id FROM account_head WHERE code = '4100'), 'A', 1),
('4140', 'Sales Discount',       'INCOME', (SELECT id FROM account_head WHERE code = '4100'), 'A', 1);
 
-- Other Income
INSERT INTO account_head (code, name, type, parent_id, status, created_by) VALUES
('4210', 'Interest Income',      'INCOME', (SELECT id FROM account_head WHERE code = '4200'), 'A', 1),
('4220', 'Miscellaneous Income', 'INCOME', (SELECT id FROM account_head WHERE code = '4200'), 'A', 1);
 
-- Cost of Goods Sold
INSERT INTO account_head (code, name, type, parent_id, status, created_by) VALUES
('5110', 'Cost of Goods Sold',    'EXPENSE', (SELECT id FROM account_head WHERE code = '5100'), 'A', 1),
('5120', 'Purchase Returns',      'EXPENSE', (SELECT id FROM account_head WHERE code = '5100'), 'A', 1),
('5130', 'Freight & Import Cost', 'EXPENSE', (SELECT id FROM account_head WHERE code = '5100'), 'A', 1);
 
-- Operating Expenses
INSERT INTO account_head (code, name, type, parent_id, status, created_by) VALUES
('5210', 'Rent & Utilities',          'EXPENSE', (SELECT id FROM account_head WHERE code = '5200'), 'A', 1),
('5220', 'Office & Admin Expenses',   'EXPENSE', (SELECT id FROM account_head WHERE code = '5200'), 'A', 1),
('5230', 'Marketing & Advertising',   'EXPENSE', (SELECT id FROM account_head WHERE code = '5200'), 'A', 1),
('5240', 'Depreciation Expense',      'EXPENSE', (SELECT id FROM account_head WHERE code = '5200'), 'A', 1),
('5250', 'Repair & Maintenance',      'EXPENSE', (SELECT id FROM account_head WHERE code = '5200'), 'A', 1),
('5260', 'Transportation & Delivery', 'EXPENSE', (SELECT id FROM account_head WHERE code = '5200'), 'A', 1);
 
-- Payroll
INSERT INTO account_head (code, name, type, parent_id, status, created_by) VALUES
('5310', 'Salaries & Wages',     'EXPENSE', (SELECT id FROM account_head WHERE code = '5300'), 'A', 1),
('5320', 'Bonuses & Allowances', 'EXPENSE', (SELECT id FROM account_head WHERE code = '5300'), 'A', 1),
('5330', 'Provident Fund',       'EXPENSE', (SELECT id FROM account_head WHERE code = '5300'), 'A', 1);
 
-- Financial Expenses
INSERT INTO account_head (code, name, type, parent_id, status, created_by) VALUES
('5410', 'Bank Charges & Fees',     'EXPENSE', (SELECT id FROM account_head WHERE code = '5400'), 'A', 1),
('5420', 'Interest Expense',        'EXPENSE', (SELECT id FROM account_head WHERE code = '5400'), 'A', 1),
('5430', 'Payment Gateway Charges', 'EXPENSE', (SELECT id FROM account_head WHERE code = '5400'), 'A', 1);
 
-- Other Expenses
INSERT INTO account_head (code, name, type, parent_id, status, created_by) VALUES
('5510', 'Tax & Duties',          'EXPENSE', (SELECT id FROM account_head WHERE code = '5500'), 'A', 1),
('5520', 'Miscellaneous Expense', 'EXPENSE', (SELECT id FROM account_head WHERE code = '5500'), 'A', 1);

CREATE TABLE account (
    id SERIAL PRIMARY KEY,
    head_id INT NOT NULL REFERENCES account_head(id),
    code VARCHAR(30) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    account_type VARCHAR(20),
    -- CASH, BANK, RECEIVABLE, PAYABLE, EXPENSE, REVENUE, GENERAL
    is_branch_controlled BOOLEAN DEFAULT FALSE,
    -- TRUE = each branch must have separate mapping
    account_no VARCHAR(50),
    status CHAR(1) DEFAULT 'A' CHECK (status IN ('A','I')),
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INT,
    updated_at TIMESTAMP
);
CREATE TABLE branch_account (
    id SERIAL PRIMARY KEY,
    branch_id INT REFERENCES branch(id),
    account_id INT REFERENCES account(id),
    account_no VARCHAR(50),
    UNIQUE(branch_id, account_id)
);
CREATE TABLE accounting_period (
    id SERIAL PRIMARY KEY,
    period_name VARCHAR(20),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    fiscal_year INT,
    is_closed BOOLEAN DEFAULT FALSE,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE journal_entry (
    id SERIAL PRIMARY KEY,
    branch_id INT REFERENCES branch(id),
    entry_no VARCHAR(30) NOT NULL,
    entry_date DATE NOT NULL,
    period_id INT REFERENCES accounting_period(id),
    source_module VARCHAR(30),
    -- POS, PURCHASE, PAYMENT, PAYROLL
    source_id INT,
    narration TEXT,
    status CHAR(1) DEFAULT 'P',
    -- D = Draft
    -- P = Posted
    -- C = Cancelled
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INT,
    updated_at TIMESTAMP,
    UNIQUE(branch_id, entry_no)
);
CREATE TABLE journal_line (
    id               SERIAL PRIMARY KEY,
    journal_entry_id INT            NOT NULL REFERENCES journal_entry(id) ON DELETE CASCADE,
    account_id       INT            NOT NULL REFERENCES account(id),
    branch_id        INT            NOT NULL REFERENCES branch(id),
    debit            NUMERIC(14,2)  NOT NULL DEFAULT 0,
    credit           NUMERIC(14,2)  NOT NULL DEFAULT 0,
    description      TEXT,
    created_at       TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (debit > 0 OR credit > 0),
    CHECK (NOT (debit > 0 AND credit > 0))
);

CREATE INDEX idx_journal_branch
ON journal_entry(branch_id);
CREATE INDEX idx_journal_date
ON journal_entry(entry_date);
CREATE INDEX idx_journal_line_account
ON journal_line(account_id);
CREATE INDEX idx_journal_line_branch
ON journal_line(branch_id);

CREATE TABLE activity_log (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    entity VARCHAR(50) NOT NULL,
    entity_id INT,
    description TEXT,
    ip_address VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE setup_data (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE,     
    group_name VARCHAR(50),      
    key_name VARCHAR(100) NOT NULL,   
    value JSONB NOT NULL,    
    status VARCHAR(1) DEFAULT 'A' CHECK (status IN ('A','I')),
    created_by INT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INT REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE customer (
    id SERIAL PRIMARY KEY,
    code VARCHAR(30) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE,
    phone VARCHAR(20) NOT NULL UNIQUE,
    password_hash TEXT,
    STATUS VARCHAR(1) DEFAULT 'A' CHECK (STATUS IN ('A','I')),
    CREATED_BY VARCHAR(50) DEFAULT USER,
    CREATION_DATE TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    LAST_UPDATE VARCHAR(50),
    LAST_UPDATE_DATE TIMESTAMP
);

CREATE TABLE customer_address (
    id SERIAL PRIMARY KEY,
    customer_id INT REFERENCES customer(id),
    label VARCHAR(50),
    address_line TEXT NOT NULL,
    city VARCHAR(50),
    area VARCHAR(50),
    postal_code VARCHAR(20),
    is_default BOOLEAN DEFAULT FALSE,
    STATUS VARCHAR(1) DEFAULT 'A' CHECK (STATUS IN ('A','I')),
    CREATION_DATE TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE delivery_methods (
    id SERIAL PRIMARY KEY,
    code VARCHAR(30) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) CHECK (type IN ('courier', 'pickup', 'cod')),
    estimated_days_min INT,
    estimated_days_max INT,
    is_active BOOLEAN DEFAULT true,
    display_order INT DEFAULT 0,
    config JSON, 
    created_by INT NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INT REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE payment_gateways (
    id SERIAL PRIMARY KEY,
    code VARCHAR(30) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    display_name VARCHAR(100),
    display_icon TEXT,
    gateway_type VARCHAR(50),
    is_active BOOLEAN DEFAULT false,
    config JSON,
    display_order INT DEFAULT 0,
    created_by INT NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INT REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE order_online (
    id SERIAL PRIMARY KEY,
    code VARCHAR(30) UNIQUE NOT NULL,
    customer_id INT REFERENCES customer(id),
    delivery_address_id INT REFERENCES customer_address(id),
    delivery_method_id INT REFERENCES delivery_method(id),
    payment_method_id INT REFERENCES payment_method(id),
    total_amount DECIMAL(12,2) NOT NULL,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    net_amount DECIMAL(12,2) GENERATED ALWAYS AS (total_amount - discount_amount) STORED,
    is_cod BOOLEAN DEFAULT FALSE,
    order_status VARCHAR(20) DEFAULT 'PENDING' CHECK (order_status IN ('PENDING','CONFIRMED','PROCESSING','SHIPPED','DELIVERED','CANCELLED','REFUNDED')),
    payment_status VARCHAR(20) DEFAULT 'UNPAID' CHECK (payment_status IN ('UNPAID','PAID','REFUNDED')),
    status VARCHAR(1) DEFAULT 'A' CHECK (status IN ('A','I')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_item_online (
    id SERIAL PRIMARY KEY,
    order_id INT REFERENCES order_online(id) ON DELETE CASCADE,
    product_variant_id INT REFERENCES product_variant(id),
    quantity DECIMAL(12,2) NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL,
    discount DECIMAL(12,2) DEFAULT 0,
    subtotal DECIMAL(12,2) GENERATED ALWAYS AS ((quantity * unit_price) - discount) STORED
);
CREATE TABLE order_delivery (
    id SERIAL PRIMARY KEY,
    order_id INT REFERENCES order_online(id),
    delivery_method_id INT REFERENCES delivery_method(id),
    tracking_code VARCHAR(100),
    delivery_status VARCHAR(20) DEFAULT 'ASSIGNED' 
    CHECK (delivery_status IN ('ASSIGNED','IN_TRANSIT','DELIVERED','RETURNED','CANCELLED')),
    cod_amount DECIMAL(12,2) DEFAULT 0,
    cod_collected BOOLEAN DEFAULT FALSE,
    cod_collected_date TIMESTAMP,
    courier_response JSONB,
    status VARCHAR(1) DEFAULT 'A' CHECK (status IN ('A','I')),
    created_by INT NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by INT REFERENCES users(id),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_payment_online (
    id SERIAL PRIMARY KEY,
    order_id INT REFERENCES order_online(id),
    payment_method_id INT REFERENCES payment_method(id),
    transaction_id VARCHAR(100),
    amount DECIMAL(12,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING','SUCCESS','FAILED','REFUNDED','COLLECTED')),
    provider_response JSONB,
    paid_at TIMESTAMP,
    record_status VARCHAR(1) DEFAULT 'A' CHECK (record_status IN ('A','I')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE customer_items (
    id SERIAL PRIMARY KEY,
    customer_id INT REFERENCES customer(id),
    product_variant_id INT REFERENCES product_variant(id),
    item_type VARCHAR(10) NOT NULL
    CHECK (item_type IN ('CART', 'WISHLIST')),

    quantity INTEGER DEFAULT 1 CHECK (quantity > 0),
    unit_price NUMERIC(10,2),
    status VARCHAR(1) DEFAULT 'A' CHECK (status IN ('A','I')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    UNIQUE (customer_id, product_variant_id, item_type)
);

CREATE TABLE product_review (
  id SERIAL PRIMARY KEY,
  order_id INT REFERENCES order_online(id),
  product_id INT REFERENCES product_variant(id),
  customer_id INT REFERENCES customer(id),
  rating NUMERIC(2,1) CHECK (rating BETWEEN 0 AND 5),
  title VARCHAR(100),
  comment TEXT,
  helpful_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE TABLE product_review_image (
  id SERIAL PRIMARY KEY,
  review_id INT REFERENCES product_review(id),
  image_url TEXT
);
-- 1. THEMES TABLE
CREATE TABLE themes (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT FALSE,
  is_default BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) DEFAULT 'draft', -- draft, published, archived
  global_css JSONB DEFAULT '{}',
  global_settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  published_at TIMESTAMP WITH TIME ZONE
);

-- 2. COMPONENT TYPES (Available section types)
CREATE TABLE component_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL, -- hero, product-grid, banner, etc.
  display_name VARCHAR(100) NOT NULL,
  category VARCHAR(50), -- header, content, footer
  icon VARCHAR(50),
  max_instances INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. COMPONENT VARIANTS (Different designs for each type)
CREATE TABLE component_variants (
  id SERIAL PRIMARY KEY,
  component_type_id INT REFERENCES component_types(id),
  variant_name VARCHAR(50) NOT NULL, -- v1, v2, v3
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  thumbnail_url VARCHAR(500),
  component_path VARCHAR(500), -- Path to React component
  config_schema JSONB NOT NULL, -- JSON Schema for config
  default_config JSONB DEFAULT '{}',
  css_template JSONB DEFAULT '{}',
  version VARCHAR(20) DEFAULT '1.0.0',
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(component_type_id, variant_name)
);

-- 4. THEME SECTIONS (Actual sections in a theme)
CREATE TABLE theme_sections (
  id SERIAL PRIMARY KEY,
  theme_id INT REFERENCES themes(id) ON DELETE CASCADE,
  component_variant_id INT REFERENCES component_variants(id),
  
  -- Section metadata
  name VARCHAR(255) NOT NULL,
  section_key VARCHAR(100) NOT NULL, -- Unique key within theme
  order_index INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN DEFAULT TRUE,
  -- Configuration
  config_data JSONB NOT NULL DEFAULT '{}',
  css_overrides JSONB DEFAULT '{}',
  content JSONB DEFAULT '{}',
  position VARCHAR(20) CHECK (position IN ('HEADER','HERO','CONTENT','FOOTER')) DEFAULT 'CONTENT',
  -- Advanced settings
  responsive_config JSONB DEFAULT '{}',
  animation_settings JSONB DEFAULT '{}',
  seo_settings JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(theme_id, section_key)
);

-- 5. ACTIVE THEME CACHE (For performance)
CREATE TABLE active_theme_cache (
  id SERIAL PRIMARY KEY,
  theme_id INT REFERENCES themes(id),
  theme_data JSONB NOT NULL,
  hash VARCHAR(64) NOT NULL,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for performance
CREATE INDEX idx_themes_is_active ON themes(is_active);
CREATE INDEX idx_themes_slug ON themes(slug);
CREATE INDEX idx_theme_sections_theme ON theme_sections(theme_id);
CREATE INDEX idx_theme_sections_order ON theme_sections(theme_id, order_index);
CREATE INDEX idx_component_variants_active ON component_variants(is_active);
CREATE INDEX idx_active_theme_cache_expires ON active_theme_cache(expires_at);
CREATE TABLE coupons (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT NOT NULL,
    discount_type VARCHAR(20) CHECK (discount_type IN ('percentage', 'fixed')) NOT NULL,
    discount_value DECIMAL(10, 2) NOT NULL CHECK (discount_value >= 0),
    min_purchase_amount DECIMAL(10, 2) CHECK (min_purchase_amount >= 0),
    max_discount_amount DECIMAL(10, 2) CHECK (max_discount_amount >= 0),
    usage_limit INTEGER CHECK (usage_limit > 0),
    usage_count INTEGER DEFAULT 0 CHECK (usage_count >= 0),
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    applicable_to VARCHAR(30) DEFAULT 'all' CHECK (applicable_to IN ('all', 'specific_categories', 'specific_products')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Add constraints
    CONSTRAINT end_date_after_start_date CHECK (end_date > start_date),
    CONSTRAINT usage_count_limit CHECK (usage_count <= COALESCE(usage_limit, usage_count)),
    
    -- For percentage discounts, ensure percentage is valid
    CONSTRAINT valid_percentage CHECK (
        discount_type != 'percentage' OR 
        (discount_value >= 0 AND discount_value <= 100)
    )
);

-- Indexes for performance
CREATE INDEX idx_coupons_code ON coupons(code);
CREATE INDEX idx_coupons_is_active ON coupons(is_active);
CREATE INDEX idx_coupons_dates ON coupons(start_date, end_date);
CREATE INDEX idx_coupons_active_dates ON coupons(is_active, start_date, end_date);

CREATE TABLE coupon_applicable_categories (
    id SERIAL PRIMARY KEY,
    coupon_id INTEGER NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
    category_id INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(coupon_id, category_id)
);

CREATE TABLE coupon_applicable_products (
    id SERIAL PRIMARY KEY,
    coupon_id INTEGER NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(coupon_id, product_id)
);
CREATE TABLE coupon_usage_history (
    id SERIAL PRIMARY KEY,
    coupon_id INTEGER NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
    order_id INTEGER NOT NULL, 
    user_id INTEGER NOT NULL, 
    discount_amount DECIMAL(10, 2) NOT NULL CHECK (discount_amount >= 0),
    used_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    
);
-- SEO
CREATE TABLE social_platform (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,          -- Facebook, Instagram
    code VARCHAR(30) UNIQUE NOT NULL,   -- META_FB, META_IG
    is_active BOOLEAN DEFAULT TRUE,
    created_by INT NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by INT REFERENCES users(id),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE social_catalog (
    id SERIAL PRIMARY KEY,
    platform_id INT REFERENCES social_platform(id),
    catalog_id VARCHAR(100),        -- Meta catalog ID
    business_id VARCHAR(100),
    access_token TEXT,
    sync_enabled BOOLEAN DEFAULT TRUE,
    last_sync_at TIMESTAMP,
    created_by INT NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by INT REFERENCES users(id),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE product_social_mapping (
    id SERIAL PRIMARY KEY,
    product_id INT REFERENCES product(id),
    platform_id INT REFERENCES social_platform(id),

    external_product_id VARCHAR(100), -- Meta product ID
    sync_status VARCHAR(30) DEFAULT 'pending', -- pending, synced, failed
    last_synced_at TIMESTAMP,

    UNIQUE (product_id, platform_id)
);
CREATE TABLE social_inventory_sync (
    id SERIAL PRIMARY KEY,
    product_id INT REFERENCES product(id),
    platform_id INT REFERENCES social_platform(id),

    stock_sent INT,
    availability VARCHAR(30), -- in stock, out of stock

    synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE social_sync_log (
    id SERIAL PRIMARY KEY,
    platform_id INT REFERENCES social_platform(id),
    product_id INT REFERENCES product(id),

    action VARCHAR(30),  -- create, update, delete
    status VARCHAR(30),  -- success, failed
    response_message TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE social_order (
    id SERIAL PRIMARY KEY,
    platform_id INT REFERENCES social_platform(id),
    external_order_id VARCHAR(100),

    order_id INT REFERENCES orders(id), -- your internal order
    status VARCHAR(30),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE seo_meta (
    id SERIAL PRIMARY KEY,

    entity_type VARCHAR(30) NOT NULL, 
    -- product, category, page, brand
    entity_id INT NOT NULL,

    meta_title VARCHAR(255),
    meta_description VARCHAR(500),
    meta_keywords TEXT,

    canonical_url VARCHAR(255),

    og_title VARCHAR(255),
    og_description VARCHAR(500),
    og_image VARCHAR(255),

    twitter_title VARCHAR(255),
    twitter_description VARCHAR(500),
    twitter_image VARCHAR(255),

    schema_json JSONB,

    is_index BOOLEAN DEFAULT TRUE,
    is_follow BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (entity_type, entity_id)
);
CREATE TABLE seo_redirect (
    id SERIAL PRIMARY KEY,
    old_url VARCHAR(255) UNIQUE NOT NULL,
    new_url VARCHAR(255) NOT NULL,
    redirect_type INT DEFAULT 301,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE seo_keyword (
    id SERIAL PRIMARY KEY,
    entity_type VARCHAR(30),
    entity_id INT,
    keyword VARCHAR(255)
);
CREATE TABLE seo_sitemap (
    id SERIAL PRIMARY KEY,
    url VARCHAR(255) UNIQUE NOT NULL,
    priority DECIMAL(2,1) DEFAULT 0.5,
    change_freq VARCHAR(20), -- daily, weekly
    last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- marketing_messages table
CREATE TABLE marketing_messages (
  id SERIAL PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,
  campaign_name VARCHAR(200) NOT NULL,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  template_name VARCHAR(100),
  status VARCHAR(20) DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INT NOT NULL REFERENCES users(id),
);

CREATE TABLE message_history (
  id SERIAL PRIMARY KEY,
  message_id INTEGER REFERENCES marketing_messages(id) ON DELETE CASCADE,
  party_id INT REFERENCES party(id), 
  recipient_phone VARCHAR(20) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', 
  delivery_status VARCHAR(50), 
  whatsapp_message_id VARCHAR(255),
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
);

