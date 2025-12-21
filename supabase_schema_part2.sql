-- PART 2: Receipts & Items Metadata
-- Run this ONLY if you have already set up Part 1 (Profiles & Storage)

-- 5. Receipts Metadata Table
create type receipt_status as enum ('processing', 'review_required', 'completed', 'failed');

create table public.receipts (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid not null references auth.users on delete cascade,
  image_path text not null, -- Path in storage bucket
  status receipt_status default 'processing',
  merchant_name text,
  total_amount decimal(10,2),
  currency text default 'EUR',
  transaction_date date,
  raw_ocr_data jsonb, -- Store full Google Vision response for debugging
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.receipts enable row level security;

create policy "Users can view own receipts metadata"
  on receipts for select
  using ( auth.uid() = user_id );

create policy "Users can insert own receipts metadata"
  on receipts for insert
  with check ( auth.uid() = user_id );

create policy "Users can update own receipts metadata"
  on receipts for update
  using ( auth.uid() = user_id );

-- 6. Receipt Line Items Table
create table public.receipt_items (
  id uuid not null default gen_random_uuid() primary key,
  receipt_id uuid not null references public.receipts on delete cascade,
  description text,
  quantity decimal(10,2) default 1.0,
  unit_price decimal(10,2),
  total_price decimal(10,2),
  vat_code text, -- e.g., '21%', '9%', '0%'
  created_at timestamp with time zone default now()
);

alter table public.receipt_items enable row level security;

create policy "Users can view own receipt items"
  on receipt_items for select
  using ( 
    exists ( select 1 from receipts where id = receipt_items.receipt_id and user_id = auth.uid() )
  );
