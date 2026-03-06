alter table public.products
  add column if not exists currency text not null default 'USD';

update public.products
set currency = 'USD'
where currency is null or currency = '';

alter table public.products
  add constraint products_currency_check
  check (currency in ('USD', 'TRY'));
