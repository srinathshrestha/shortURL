-- Migration 002: Add optional title column to links
-- Lets users label their short URLs.

-- migrate:up
ALTER TABLE links ADD COLUMN title TEXT;

-- migrate:down
ALTER TABLE links DROP COLUMN title;
