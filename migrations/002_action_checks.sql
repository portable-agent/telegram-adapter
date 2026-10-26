CREATE TABLE IF NOT EXISTS telegram_action_checks (
    action_id UUID PRIMARY KEY,
    telegram_user_id BIGINT NOT NULL REFERENCES telegram_links (telegram_user_id) ON DELETE CASCADE,
    chat_id BIGINT NOT NULL,
    check_after TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS telegram_action_checks_ready_idx
    ON telegram_action_checks (check_after);
