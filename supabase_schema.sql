-- 1. Create Profiles Table (Public Profile Data)
create table public.profiles (
  id uuid not null references auth.users on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  updated_at timestamp with time zone,
  primary key (id)
);

alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- 2. Handle New User Signup (Trigger to auto-create profile)
-- This ensures every new specific user gets a row in public.profiles
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 3. Storage Bucket for Receipts
-- We attempt to insert the bucket configuration directly.
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false);

-- 4. Storage Policies (Security)
create policy "Authenticated users can upload receipts"
  on storage.objects for insert
  to authenticated
  with check ( bucket_id = 'receipts' and auth.uid() = owner );

create policy "Users can view their own receipts"
  on storage.objects for select
  to authenticated
  using ( bucket_id = 'receipts' and auth.uid() = owner );

create policy "Users can update their own receipts"
  on storage.objects for update
  to authenticated
  using ( bucket_id = 'receipts' and auth.uid() = owner );

create policy "Users can delete their own receipts"
  on storage.objects for delete
  to authenticated
  using ( bucket_id = 'receipts' and auth.uid() = owner );

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

