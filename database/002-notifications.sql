CREATE TABLE IF NOT EXISTS garbalia.order_notifications (
  order_id uuid NOT NULL REFERENCES garbalia.orders(id),
  channel text NOT NULL CHECK (channel IN ('telegram','whatsapp')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sending','sent','failed')),
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  locked_until timestamptz,
  lease_id uuid,
  destination text,
  provider_message_id text,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (order_id, channel)
);
CREATE INDEX IF NOT EXISTS notifications_due ON garbalia.order_notifications(status,next_attempt_at);
ALTER TABLE garbalia.order_notifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON garbalia.order_notifications FROM PUBLIC;
