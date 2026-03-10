-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Transfers table
create table transfers (
  id uuid primary key default uuid_generate_v4(),
  share_token text unique not null,
  expires_at timestamptz not null,
  download_count integer default 0,
  created_at timestamptz default now()
);

-- Files table
create table files (
  id uuid primary key default uuid_generate_v4(),
  transfer_id uuid not null references transfers(id) on delete cascade,
  filename text not null,
  size_bytes bigint not null,
  r2_key text not null,
  mime_type text
);

-- Indexes
create index idx_transfers_share_token on transfers(share_token);
create index idx_transfers_expires_at on transfers(expires_at);
create index idx_files_transfer_id on files(transfer_id);
