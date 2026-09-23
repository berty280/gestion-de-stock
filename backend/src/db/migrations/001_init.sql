-- Comptoir — initial schema (see docs/SPEC.md §3 "Modèle de données").
-- Enum string values are kept verbatim from the spec (French domain terms).

PRAGMA foreign_keys = ON;

-- users (id, nom, email, mot_de_passe_hash, rôle, actif)
CREATE TABLE users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT    NOT NULL,
  email         TEXT    NOT NULL UNIQUE,
  password_hash TEXT    NOT NULL,
  role          TEXT    NOT NULL CHECK (role IN ('OPERATOR', 'ADMIN', 'SUPERVISOR')),
  active        INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- products (id, gtin, nom, marque, catégorie, image_url, unité,
--           mini_vitrine=1, mini_stock, source [api|manuel], created_at)
CREATE TABLE products (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  gtin         TEXT    UNIQUE,               -- EAN-13 / GTIN; NULL for manual-only items
  name         TEXT    NOT NULL,
  brand        TEXT,
  category     TEXT,
  image_url    TEXT,
  unit         TEXT,                          -- e.g. "pièce", "ml", "g"
  mini_vitrine INTEGER NOT NULL DEFAULT 1 CHECK (mini_vitrine >= 0),
  mini_stock   INTEGER NOT NULL DEFAULT 0 CHECK (mini_stock >= 0),
  source       TEXT    NOT NULL DEFAULT 'manuel' CHECK (source IN ('api', 'manuel')),
  created_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- customers (id, nom, téléphone, inconnu:bool, created_at)
CREATE TABLE customers (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL,
  phone      TEXT,
  unknown    INTEGER NOT NULL DEFAULT 0 CHECK (unknown IN (0, 1)),
  created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- sales (id, customer_id, user_id, created_at)
-- The sale lines are the VENTE movements linked via sale_id.
CREATE TABLE sales (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER REFERENCES customers(id),
  user_id     INTEGER NOT NULL REFERENCES users(id),
  created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- movements — append-only, source of truth
-- (id, product_id, type, quantity, from, to, user_id, sale_id?, scan_uid, created_at)
CREATE TABLE movements (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id    INTEGER NOT NULL REFERENCES products(id),
  type          TEXT    NOT NULL CHECK (type IN ('RECEPTION', 'REAPPRO', 'VENTE', 'AJUSTEMENT')),
  quantity      INTEGER NOT NULL CHECK (quantity > 0),
  from_location TEXT    CHECK (from_location IN ('VITRINE', 'STOCK')),
  to_location   TEXT    CHECK (to_location IN ('VITRINE', 'STOCK')),
  user_id       INTEGER NOT NULL REFERENCES users(id),
  sale_id       INTEGER REFERENCES sales(id),
  scan_uid      TEXT    UNIQUE,              -- idempotence key; replaying a uid is a no-op
  created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- stock_levels — derived cache of current quantities, rebuildable from movements.
CREATE TABLE stock_levels (
  product_id INTEGER NOT NULL REFERENCES products(id),
  location   TEXT    NOT NULL CHECK (location IN ('VITRINE', 'STOCK')),
  quantity   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (product_id, location)
);

-- alerts (id, product_id, type, status, email_sent, created_at, resolved_at)
CREATE TABLE alerts (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id  INTEGER NOT NULL REFERENCES products(id),
  type        TEXT    NOT NULL CHECK (type IN ('VITRINE_LOW', 'STOCK_LOW')),
  status      TEXT    NOT NULL DEFAULT 'OUVERTE' CHECK (status IN ('OUVERTE', 'RESOLUE')),
  email_sent  INTEGER NOT NULL DEFAULT 0 CHECK (email_sent IN (0, 1)),
  created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  resolved_at TEXT
);

CREATE INDEX idx_movements_product ON movements(product_id);
CREATE INDEX idx_movements_sale    ON movements(sale_id);
CREATE INDEX idx_movements_created ON movements(created_at);
CREATE INDEX idx_alerts_status     ON alerts(status);

-- At most one OPEN alert per (product, type): enforces "pas de doublon d'alerte ouverte".
CREATE UNIQUE INDEX idx_alerts_open_unique
  ON alerts(product_id, type)
  WHERE status = 'OUVERTE';
