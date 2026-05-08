-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "timescaledb" CASCADE;

-- Índices de texto para busca
CREATE INDEX IF NOT EXISTS idx_assets_search ON assets USING gin(to_tsvector('portuguese', name || ' ' || COALESCE(description, '')));
