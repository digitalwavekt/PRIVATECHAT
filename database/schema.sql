-- ============================================================
-- PRIVACHAT — Complete Supabase Schema
-- Run this entire file in Supabase SQL Editor
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── USERS ────────────────────────────────────────────────────
CREATE TABLE public.users (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name          TEXT NOT NULL,
  mobile        TEXT UNIQUE NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  avatar_url    TEXT,
  status        TEXT DEFAULT 'pending'   -- pending | active | blocked | rejected
    CHECK (status IN ('pending','active','blocked','rejected')),
  about         TEXT DEFAULT 'Hey! I am using PrivaChat.',
  is_online     BOOLEAN DEFAULT FALSE,
  last_seen     TIMESTAMP DEFAULT NOW(),
  push_token    TEXT,   -- for web push notifications
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);

-- ── CONTACTS (saved names for other users) ───────────────────
CREATE TABLE public.contacts (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  contact_id  UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  saved_name  TEXT,  -- custom name user saves for this contact
  is_blocked  BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, contact_id)
);

-- ── CONVERSATIONS (1-to-1 or group) ──────────────────────────
CREATE TABLE public.conversations (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  type          TEXT NOT NULL DEFAULT 'direct'
    CHECK (type IN ('direct','group')),
  -- Group fields
  name          TEXT,           -- group name
  description   TEXT,
  avatar_url    TEXT,           -- group avatar
  created_by    UUID REFERENCES public.users(id) ON DELETE SET NULL,
  -- Last message preview (denormalized for performance)
  last_message  TEXT,
  last_message_at TIMESTAMP,
  last_message_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);

-- ── CONVERSATION MEMBERS ─────────────────────────────────────
CREATE TABLE public.conversation_members (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  user_id         UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  role            TEXT DEFAULT 'member' CHECK (role IN ('admin','member')),
  joined_at       TIMESTAMP DEFAULT NOW(),
  last_read_at    TIMESTAMP DEFAULT NOW(),
  is_muted        BOOLEAN DEFAULT FALSE,
  UNIQUE(conversation_id, user_id)
);

-- ── MESSAGES ─────────────────────────────────────────────────
CREATE TABLE public.messages (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id       UUID REFERENCES public.users(id) ON DELETE SET NULL NOT NULL,
  type            TEXT NOT NULL DEFAULT 'text'
    CHECK (type IN ('text','image','video','audio','document','location','system')),
  content         TEXT,         -- text content or caption
  file_url        TEXT,         -- media file URL
  file_name       TEXT,         -- original filename
  file_size       INTEGER,      -- bytes
  file_mime       TEXT,         -- MIME type
  duration        INTEGER,      -- audio/video duration in seconds
  thumbnail_url   TEXT,         -- video thumbnail
  -- Location
  latitude        DECIMAL(10,8),
  longitude       DECIMAL(11,8),
  location_name   TEXT,
  -- Reply
  reply_to_id     UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  -- Status
  is_deleted      BOOLEAN DEFAULT FALSE,
  deleted_for_everyone BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMP DEFAULT NOW()
);

-- ── MESSAGE RECEIPTS (read receipts) ─────────────────────────
CREATE TABLE public.message_receipts (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE NOT NULL,
  user_id    UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  status     TEXT DEFAULT 'delivered' CHECK (status IN ('delivered','read')),
  read_at    TIMESTAMP,
  UNIQUE(message_id, user_id)
);

-- ── ADMIN TABLE ───────────────────────────────────────────────
CREATE TABLE public.admins (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL,
  created_at    TIMESTAMP DEFAULT NOW()
);

-- ── ADMIN ACTIONS LOG ────────────────────────────────────────
CREATE TABLE public.admin_logs (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  admin_id    UUID REFERENCES public.admins(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,  -- approve_user | block_user | delete_message | etc.
  target_id   TEXT,           -- user_id or message_id affected
  details     JSONB,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- ── SIGNUP REQUESTS (pending approvals) ──────────────────────
CREATE TABLE public.signup_requests (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name          TEXT NOT NULL,
  mobile        TEXT UNIQUE NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  status        TEXT DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected')),
  rejection_reason TEXT,
  requested_at  TIMESTAMP DEFAULT NOW(),
  reviewed_at   TIMESTAMP,
  reviewed_by   UUID REFERENCES public.admins(id) ON DELETE SET NULL
);

-- ── INDEXES ───────────────────────────────────────────────────
CREATE INDEX idx_messages_conversation ON public.messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender       ON public.messages(sender_id);
CREATE INDEX idx_conv_members_user     ON public.conversation_members(user_id);
CREATE INDEX idx_conv_members_conv     ON public.conversation_members(conversation_id);
CREATE INDEX idx_contacts_user         ON public.contacts(user_id);
CREATE INDEX idx_users_status          ON public.users(status);
CREATE INDEX idx_users_mobile          ON public.users(mobile);
CREATE INDEX idx_signup_status         ON public.signup_requests(status);

-- ── STORAGE BUCKETS ───────────────────────────────────────────
-- Run these in Supabase Dashboard → Storage → New Bucket:
-- 1. "chat-media"   (public: true)  — images, videos, documents
-- 2. "audio-msgs"   (public: true)  — voice messages
-- 3. "avatars"      (public: true)  — user & group avatars

-- ── DEFAULT ADMIN ─────────────────────────────────────────────
-- Password: Admin@123 (change immediately after first login!)
INSERT INTO public.admins (email, password_hash, name)
VALUES (
  'admin@privachat.com',
  '$2b$10$rOzJqjxnE7hNx8oYdaR./.example.hash.change.this',
  'Super Admin'
);
-- NOTE: Run this in backend to get real hash:
-- node -e "const b=require('bcryptjs');console.log(b.hashSync('Admin@123',10))"
-- Then UPDATE admins SET password_hash='[output]' WHERE email='admin@privachat.com';

-- ── RPC: find existing direct conversation ────────────────────
CREATE OR REPLACE FUNCTION find_direct_conversation(user1 UUID, user2 UUID)
RETURNS TABLE(conversation_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT cm1.conversation_id
  FROM conversation_members cm1
  JOIN conversation_members cm2 ON cm1.conversation_id = cm2.conversation_id
  JOIN conversations c ON c.id = cm1.conversation_id
  WHERE cm1.user_id = user1
    AND cm2.user_id = user2
    AND c.type = 'direct';
END;
$$ LANGUAGE plpgsql;
