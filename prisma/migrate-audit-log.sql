CREATE TABLE "AuditLog" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT,
  email TEXT,
  action TEXT NOT NULL,
  details TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
