-- LinkVerse Analytics Platform — Initial Schema
-- Run once to initialize a fresh PostgreSQL database.
-- Uses pgcrypto for gen_random_uuid().

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Users: email/password auth, bcrypt hashed
CREATE TABLE users (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    email       TEXT        UNIQUE NOT NULL,
    password    TEXT        NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Links: short URLs owned by users, slug is the short path
CREATE TABLE links (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        REFERENCES users(id) ON DELETE CASCADE,
    slug        TEXT        UNIQUE NOT NULL,
    long_url    TEXT        NOT NULL,
    title       TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_links_slug ON links(slug);
CREATE INDEX idx_links_user_id ON links(user_id);

-- Click events: anonymous analytics per redirect
CREATE TABLE click_events (
    id          BIGSERIAL   PRIMARY KEY,
    slug        TEXT        NOT NULL,
    ip          INET,
    country     TEXT,
    city        TEXT,
    device      TEXT,       -- 'mobile' | 'desktop' | 'bot' | 'tablet'
    referrer    TEXT,
    clicked_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_clicks_slug      ON click_events(slug);
CREATE INDEX idx_clicks_time      ON click_events(clicked_at);
CREATE INDEX idx_clicks_slug_time ON click_events(slug, clicked_at);

-- Tracks applied migrations (used by migrate.sh)
CREATE TABLE schema_migrations (
    version     TEXT PRIMARY KEY,
    applied_at  TIMESTAMPTZ DEFAULT NOW()
);
