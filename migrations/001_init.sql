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
