CREATE TABLE IF NOT EXISTS telegram_pending_links (
    telegram_user_id BIGINT PRIMARY KEY,
    chat_id BIGINT NOT NULL,
    device_code JSONB NOT NULL,
    user_code TEXT NOT NULL,
    verify_url TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    poll_after TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS telegram_pending_links_poll_idx
    ON telegram_pending_links (poll_after);

CREATE TABLE IF NOT EXISTS telegram_links (
    telegram_user_id BIGINT PRIMARY KEY,
    chat_id BIGINT NOT NULL,
    refresh_token JSONB NOT NULL,
    conversation_id UUID,
    linked_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE telegram_links ADD COLUMN IF NOT EXISTS conversation_id UUID;

CREATE TABLE IF NOT EXISTS telegram_callbacks (
    id UUID PRIMARY KEY,
    telegram_user_id BIGINT NOT NULL REFERENCES telegram_links (telegram_user_id) ON DELETE CASCADE,
    action_id UUID NOT NULL,
    payload_hash CHAR(64) NOT NULL,
    decision TEXT NOT NULL CHECK (decision IN ('CONFIRM', 'CANCEL')),
    expires_at TIMESTAMPTZ NOT NULL,
    claimed_until TIMESTAMPTZ,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE telegram_callbacks ADD COLUMN IF NOT EXISTS claimed_until TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS telegram_callbacks_user_idx
    ON telegram_callbacks (telegram_user_id, expires_at);
