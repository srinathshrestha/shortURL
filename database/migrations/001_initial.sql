-- Migration 001: Initial schema
-- Creates users, links, click_events, schema_migrations.

-- migrate:up
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    email       TEXT        UNIQUE NOT NULL,
    password    TEXT        NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE links (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        REFERENCES users(id) ON DELETE CASCADE,
    slug        TEXT        UNIQUE NOT NULL,
    long_url    TEXT        NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_links_slug ON links(slug);
CREATE INDEX idx_links_user_id ON links(user_id);

CREATE TABLE click_events (
    id          BIGSERIAL   PRIMARY KEY,
    slug        TEXT        NOT NULL,
    ip          INET,
    country     TEXT,
    city        TEXT,
    device      TEXT,
    referrer    TEXT,
    clicked_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_clicks_slug      ON click_events(slug);
CREATE INDEX idx_clicks_time      ON click_events(clicked_at);
CREATE INDEX idx_clicks_slug_time ON click_events(slug, clicked_at);

CREATE TABLE IF NOT EXISTS schema_migrations (
    version     TEXT PRIMARY KEY,
    applied_at  TIMESTAMPTZ DEFAULT NOW()
);

-- migrate:down
DROP TABLE IF EXISTS click_events;
DROP TABLE IF EXISTS links;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS schema_migrations;
