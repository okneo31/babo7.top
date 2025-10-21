-- Babo7 Messenger Database Schema for Supabase (PostgreSQL)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    password VARCHAR(255) NOT NULL, -- bcrypt hashed
    avatar TEXT,
    bio TEXT,

    -- Public Keys (E2EE)
    identity_key TEXT NOT NULL, -- Long-term public key

    -- Status
    is_online BOOLEAN DEFAULT false,
    last_seen TIMESTAMP WITH TIME ZONE,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Indexes
    CONSTRAINT username_length CHECK (char_length(username) >= 3)
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_is_online ON users(is_online);

-- Encryption Keys Table
CREATE TABLE encryption_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Signed Prekey
    signed_prekey_id INTEGER NOT NULL,
    signed_prekey_public TEXT NOT NULL,
    signed_prekey_signature TEXT NOT NULL,

    -- One-time Prekeys
    onetime_prekey_id INTEGER,
    onetime_prekey_public TEXT,
    is_used BOOLEAN DEFAULT false,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,

    -- Indexes
    UNIQUE(user_id, signed_prekey_id),
    UNIQUE(user_id, onetime_prekey_id)
);

CREATE INDEX idx_keys_user_id ON encryption_keys(user_id);
CREATE INDEX idx_keys_unused_onetime ON encryption_keys(user_id, is_used)
    WHERE is_used = false AND onetime_prekey_id IS NOT NULL;

-- Conversations Table
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(20) NOT NULL CHECK (type IN ('direct', 'group')),

    -- Group specific
    group_name VARCHAR(100),
    group_avatar TEXT,
    created_by UUID REFERENCES users(id),

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_conversations_type ON conversations(type);

-- Conversation Participants Table
CREATE TABLE conversation_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Permissions
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('admin', 'member')),

    -- Read status
    last_read_message_id UUID,
    unread_count INTEGER DEFAULT 0,

    -- Group specific
    sender_key TEXT, -- For group E2EE

    -- Metadata
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    left_at TIMESTAMP WITH TIME ZONE,

    -- Constraints
    UNIQUE(conversation_id, user_id)
);

CREATE INDEX idx_participants_conversation ON conversation_participants(conversation_id);
CREATE INDEX idx_participants_user ON conversation_participants(user_id);
CREATE INDEX idx_participants_unread ON conversation_participants(user_id, unread_count)
    WHERE unread_count > 0;

-- Messages Table
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,

    -- E2EE Encrypted Content
    encrypted_content TEXT NOT NULL,
    encryption_header JSONB NOT NULL, -- Contains ephemeral key, chain info, etc.

    -- Message Type
    message_type VARCHAR(20) NOT NULL CHECK (message_type IN ('text', 'image', 'video', 'audio', 'file')),

    -- File metadata (encrypted files)
    file_url TEXT,
    file_size BIGINT,
    thumbnail_url TEXT,

    -- Status
    status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sending', 'sent', 'delivered', 'read', 'failed')),

    -- Disappearing messages
    expires_at TIMESTAMP WITH TIME ZONE,
    is_deleted BOOLEAN DEFAULT false,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_status ON messages(status);
CREATE INDEX idx_messages_expires ON messages(expires_at) WHERE expires_at IS NOT NULL;

-- Message Recipients Table (for delivery/read receipts)
CREATE TABLE message_recipients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Status
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,

    UNIQUE(message_id, user_id)
);

CREATE INDEX idx_recipients_message ON message_recipients(message_id);
CREATE INDEX idx_recipients_user ON message_recipients(user_id);

-- Calls Table (Video/Audio)
CREATE TABLE calls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
    caller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Call Type
    call_type VARCHAR(20) NOT NULL CHECK (call_type IN ('audio', 'video')),

    -- Status
    status VARCHAR(20) DEFAULT 'ringing' CHECK (status IN ('ringing', 'ongoing', 'ended', 'missed', 'declined')),

    -- WebRTC Signaling (encrypted)
    signaling_data JSONB,

    -- Timing
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    duration INTEGER -- in seconds
);

CREATE INDEX idx_calls_caller ON calls(caller_id);
CREATE INDEX idx_calls_conversation ON calls(conversation_id);
CREATE INDEX idx_calls_status ON calls(status);

-- Call Participants Table
CREATE TABLE call_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Status
    joined_at TIMESTAMP WITH TIME ZONE,
    left_at TIMESTAMP WITH TIME ZONE,

    UNIQUE(call_id, user_id)
);

CREATE INDEX idx_call_participants_call ON call_participants(call_id);
CREATE INDEX idx_call_participants_user ON call_participants(user_id);

-- Sessions Table (for device management)
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Device Info
    device_name VARCHAR(100),
    device_type VARCHAR(50), -- ios, android
    device_id VARCHAR(255) UNIQUE,

    -- Token
    refresh_token TEXT,

    -- Status
    is_active BOOLEAN DEFAULT true,
    last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_device ON sessions(device_id);
CREATE INDEX idx_sessions_active ON sessions(user_id, is_active) WHERE is_active = true;

-- Push Notification Tokens
CREATE TABLE push_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id VARCHAR(255) NOT NULL,

    -- Token
    token TEXT NOT NULL,
    platform VARCHAR(20) NOT NULL CHECK (platform IN ('ios', 'android')),

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(user_id, device_id)
);

CREATE INDEX idx_push_tokens_user ON push_tokens(user_id);

-- Contact Requests Table
CREATE TABLE contact_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    to_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'blocked')),

    -- Message
    message TEXT,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(from_user_id, to_user_id)
);

CREATE INDEX idx_contact_requests_to ON contact_requests(to_user_id, status);
CREATE INDEX idx_contact_requests_from ON contact_requests(from_user_id);

-- ============================================
-- Row Level Security (RLS) Policies
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE encryption_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_requests ENABLE ROW LEVEL SECURITY;

-- Users: Can read all users (for search), but only update own profile
CREATE POLICY "Users can view all profiles"
    ON users FOR SELECT
    USING (true);

CREATE POLICY "Users can update own profile"
    ON users FOR UPDATE
    USING (auth.uid() = id);

-- Encryption Keys: Can read others' public keys, manage own keys
CREATE POLICY "Users can read public keys"
    ON encryption_keys FOR SELECT
    USING (true);

CREATE POLICY "Users can manage own keys"
    ON encryption_keys FOR ALL
    USING (auth.uid() = user_id);

-- Conversations: Can only access conversations they're part of
CREATE POLICY "Users can view own conversations"
    ON conversations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM conversation_participants
            WHERE conversation_id = conversations.id
            AND user_id = auth.uid()
            AND left_at IS NULL
        )
    );

CREATE POLICY "Users can create conversations"
    ON conversations FOR INSERT
    WITH CHECK (auth.uid() = created_by);

-- Messages: Can only read/write messages in their conversations
CREATE POLICY "Users can read messages in their conversations"
    ON messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM conversation_participants
            WHERE conversation_id = messages.conversation_id
            AND user_id = auth.uid()
            AND left_at IS NULL
        )
    );

CREATE POLICY "Users can send messages to their conversations"
    ON messages FOR INSERT
    WITH CHECK (
        auth.uid() = sender_id
        AND EXISTS (
            SELECT 1 FROM conversation_participants
            WHERE conversation_id = messages.conversation_id
            AND user_id = auth.uid()
            AND left_at IS NULL
        )
    );

-- Sessions: Users can only manage their own sessions
CREATE POLICY "Users can manage own sessions"
    ON sessions FOR ALL
    USING (auth.uid() = user_id);

-- ============================================
-- Functions & Triggers
-- ============================================

-- Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update conversation updated_at on new message
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations
    SET updated_at = NEW.created_at
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conversation_timestamp AFTER INSERT ON messages
    FOR EACH ROW EXECUTE FUNCTION update_conversation_on_message();

-- Increment unread count for recipients
CREATE OR REPLACE FUNCTION increment_unread_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversation_participants
    SET unread_count = unread_count + 1
    WHERE conversation_id = NEW.conversation_id
    AND user_id != NEW.sender_id
    AND left_at IS NULL;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER increment_unread AFTER INSERT ON messages
    FOR EACH ROW EXECUTE FUNCTION increment_unread_count();

-- Auto-delete expired messages
CREATE OR REPLACE FUNCTION delete_expired_messages()
RETURNS void AS $$
BEGIN
    UPDATE messages
    SET is_deleted = true,
        encrypted_content = '',
        encryption_header = '{}'::jsonb
    WHERE expires_at IS NOT NULL
    AND expires_at < NOW()
    AND is_deleted = false;
END;
$$ LANGUAGE plpgsql;

-- Schedule periodic cleanup (requires pg_cron extension)
-- SELECT cron.schedule('delete-expired-messages', '*/5 * * * *', 'SELECT delete_expired_messages()');

-- ============================================
-- Initial Data / Seed (Optional)
-- ============================================

-- Insert system user for announcements
-- INSERT INTO users (username, display_name, password, identity_key)
-- VALUES ('system', 'Babo7 System', '', 'system_identity_key');

-- ============================================
-- Views for convenience
-- ============================================

-- View: User's conversation list with last message
CREATE OR REPLACE VIEW user_conversations AS
SELECT
    c.id,
    c.type,
    c.group_name,
    c.group_avatar,
    c.created_at,
    c.updated_at,
    cp.user_id,
    cp.unread_count,
    cp.last_read_message_id,
    (
        SELECT json_build_object(
            'id', m.id,
            'content', m.encrypted_content,
            'sender_id', m.sender_id,
            'created_at', m.created_at,
            'message_type', m.message_type
        )
        FROM messages m
        WHERE m.conversation_id = c.id
        ORDER BY m.created_at DESC
        LIMIT 1
    ) AS last_message,
    (
        SELECT json_agg(
            json_build_object(
                'id', u.id,
                'username', u.username,
                'display_name', u.display_name,
                'avatar', u.avatar,
                'is_online', u.is_online
            )
        )
        FROM conversation_participants cp2
        JOIN users u ON u.id = cp2.user_id
        WHERE cp2.conversation_id = c.id
        AND cp2.user_id != cp.user_id
        AND cp2.left_at IS NULL
    ) AS participants
FROM conversations c
JOIN conversation_participants cp ON cp.conversation_id = c.id
WHERE cp.left_at IS NULL;

-- ============================================
-- Indexes for Performance
-- ============================================

-- Additional composite indexes for common queries
CREATE INDEX idx_messages_conversation_created ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_conversation_unread ON messages(conversation_id, status)
    WHERE status != 'read';

-- Full-text search on users (optional)
CREATE INDEX idx_users_search ON users USING gin(
    to_tsvector('english', display_name || ' ' || username)
);

-- ============================================
-- Comments for documentation
-- ============================================

COMMENT ON TABLE users IS 'User accounts with public identity keys';
COMMENT ON TABLE encryption_keys IS 'E2EE public keys (Signed Prekeys & One-time Prekeys)';
COMMENT ON TABLE messages IS 'Encrypted messages - server cannot decrypt content';
COMMENT ON TABLE conversations IS 'Chat conversations (direct or group)';
COMMENT ON TABLE calls IS 'WebRTC voice/video call records';
COMMENT ON COLUMN messages.encrypted_content IS 'AES-256 encrypted message content';
COMMENT ON COLUMN messages.encryption_header IS 'Signal protocol metadata for decryption';
