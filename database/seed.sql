-- LinkVerse — Seed data for local development
-- Test users: alice@test.com, bob@test.com — both password: password123
-- Run after schema/migrations.

-- Clear existing seed data (optional, for re-seeding)
TRUNCATE click_events, links, users RESTART IDENTITY CASCADE;

-- Test users (bcrypt hash for "password123")
INSERT INTO users (id, email, password) VALUES
    ('a0000000-0000-0000-0000-000000000001', 'alice@test.com', '$2a$10$TI4yxLgJKGe1THvUuvktWOpmgEH5J9/4UTV6MjQGte4W9CWYeI6we'),
    ('b0000000-0000-0000-0000-000000000002', 'bob@test.com', '$2a$10$TI4yxLgJKGe1THvUuvktWOpmgEH5J9/4UTV6MjQGte4W9CWYeI6we');

-- Links for Alice (3 links)
INSERT INTO links (id, user_id, slug, long_url, title) VALUES
    ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'x7kP2a', 'https://example.com/blog/post-1', 'Blog Post 1'),
    ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'y9mK4b', 'https://example.com/landing', 'Landing Page'),
    ('c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'z2nQ8c', 'https://github.com/user/repo', 'GitHub Repo');

-- Links for Bob (3 links)
INSERT INTO links (id, user_id, slug, long_url, title) VALUES
    ('d0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'a3pL1d', 'https://example.com/product', 'Product Page'),
    ('d0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'b5rM7e', 'https://twitter.com/share', 'Twitter Share'),
    ('d0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000002', 'c8sN2f', 'https://linkedin.com/in/profile', 'LinkedIn Profile');

-- Click events (~20) — varied country, device, referrer
INSERT INTO click_events (slug, ip, country, city, device, referrer, clicked_at) VALUES
    ('x7kP2a', '203.0.113.45'::inet, 'US', 'San Francisco', 'desktop', 'https://twitter.com', NOW() - interval '2 days'),
    ('x7kP2a', '198.51.100.22'::inet, 'GB', 'London', 'mobile', 'https://facebook.com', NOW() - interval '1 day'),
    ('x7kP2a', '192.0.2.100'::inet, 'DE', 'Berlin', 'desktop', NULL, NOW() - interval '12 hours'),
    ('y9mK4b', '203.0.113.10'::inet, 'FR', 'Paris', 'mobile', 'https://google.com', NOW() - interval '3 days'),
    ('y9mK4b', '198.51.100.55'::inet, 'JP', 'Tokyo', 'desktop', 'https://linkedin.com', NOW() - interval '2 days'),
    ('z2nQ8c', '192.0.2.200'::inet, 'CA', 'Toronto', 'tablet', 'https://reddit.com', NOW() - interval '5 days'),
    ('z2nQ8c', '203.0.113.88'::inet, 'AU', 'Sydney', 'mobile', NULL, NOW() - interval '1 day'),
    ('a3pL1d', '198.51.100.11'::inet, 'US', 'New York', 'desktop', 'https://news.ycombinator.com', NOW() - interval '4 days'),
    ('a3pL1d', '192.0.2.33'::inet, 'IN', 'Mumbai', 'mobile', 'https://whatsapp.com', NOW() - interval '6 hours'),
    ('b5rM7e', '203.0.113.77'::inet, 'BR', 'São Paulo', 'desktop', 'https://instagram.com', NOW() - interval '1 day'),
    ('b5rM7e', '198.51.100.99'::inet, 'MX', 'Mexico City', 'mobile', NULL, NOW() - interval '2 days'),
    ('c8sN2f', '192.0.2.155'::inet, 'NL', 'Amsterdam', 'desktop', 'https://twitter.com', NOW() - interval '3 days'),
    ('x7kP2a', '203.0.113.3'::inet, 'US', 'Chicago', 'bot', 'https://slurp', NOW() - interval '10 hours'),
    ('y9mK4b', '198.51.100.44'::inet, 'IT', 'Rome', 'mobile', 'https://google.com', NOW() - interval '8 hours'),
    ('z2nQ8c', '192.0.2.66'::inet, 'ES', 'Madrid', 'desktop', 'https://facebook.com', NOW() - interval '1 day'),
    ('a3pL1d', '203.0.113.99'::inet, 'KR', 'Seoul', 'mobile', 'https://naver.com', NOW() - interval '4 hours'),
    ('b5rM7e', '198.51.100.12'::inet, 'PL', 'Warsaw', 'desktop', NULL, NOW() - interval '7 days'),
    ('c8sN2f', '192.0.2.88'::inet, 'SE', 'Stockholm', 'mobile', 'https://linkedin.com', NOW() - interval '2 days'),
    ('x7kP2a', '203.0.113.22'::inet, 'SG', 'Singapore', 'tablet', 'https://google.com', NOW() - interval '5 hours'),
    ('c8sN2f', '198.51.100.77'::inet, 'CH', 'Zurich', 'desktop', 'https://xing.com', NOW() - interval '1 day');
