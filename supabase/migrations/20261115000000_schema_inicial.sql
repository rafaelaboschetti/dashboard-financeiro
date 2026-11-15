-- =====================================================================
-- Finanças da Empresa — esquema inicial do banco (Supabase / Postgres)
--
-- Como aplicar: Supabase → SQL Editor → cole este arquivo inteiro → Run.
--
-- Regras de acesso (RLS):
--   * cada usuário só enxerga os dados da PRÓPRIA empresa;
--   * Administrador e Financeiro podem gravar; Leitura só lê;
--   * só o Administrador gerencia a equipe e os convites.
-- Tudo é conferido no servidor: alterar o app ou o navegador não contorna as regras.
-- Valores em centavos (bigint) e datas como `date`.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------

create table public.companies (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(trim(name)) between 1 and 120),
  created_at  timestamptz not null default now()
);

create table public.profiles (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  company_id  uuid not null references public.companies (id) on delete cascade,
  name        text not null check (char_length(trim(name)) between 1 and 120),
  email       text not null,
  role        text not null check (role in ('admin', 'financeiro', 'leitura')),
  created_at  timestamptz not null default now()
);
create index profiles_company_idx on public.profiles (company_id);

-- Convites: o admin cadastra o e-mail e o perfil; a pessoa cria a própria conta
-- no app com esse e-mail e entra automaticamente na empresa.
create table public.invitations (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.companies (id) on delete cascade,
  email        text not null check (email = lower(trim(email)) and email like '%@%'),
  role         text not null check (role in ('admin', 'financeiro', 'leitura')),
  invited_by   uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  accepted_at  timestamptz
);
create unique index invitations_pending_email_idx on public.invitations (email) where accepted_at is null;

create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies (id) on delete cascade,
  name        text not null check (char_length(trim(name)) between 1 and 60),
  type        text not null check (type in ('in', 'out')),
  color       text not null default '#0F766E' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  created_at  timestamptz not null default now()
);
create unique index categories_unique_name_idx on public.categories (company_id, type, lower(name));

create table public.bills (
  id                  uuid primary key default gen_random_uuid(),
  company_id          uuid not null references public.companies (id) on delete cascade,
  description         text not null check (char_length(trim(description)) between 1 and 200),
  amount_cents        bigint not null check (amount_cents > 0),
  due_date            date not null,
  category_id         uuid references public.categories (id) on delete set null,
  supplier            text check (supplier is null or char_length(supplier) <= 120),
  recurrence          text not null default 'none' check (recurrence in ('none', 'monthly', 'yearly')),
  remind_days_before  int not null default 1 check (remind_days_before between 0 and 60),
  paid_at             date,
  -- próxima conta gerada automaticamente quando uma conta recorrente é paga
  next_bill_id        uuid references public.bills (id) on delete set null,
  created_at          timestamptz not null default now()
);
create index bills_company_due_idx on public.bills (company_id, due_date);

create table public.transactions (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies (id) on delete cascade,
  type          text not null check (type in ('in', 'out')),
  description   text not null check (char_length(trim(description)) between 1 and 200),
  amount_cents  bigint not null check (amount_cents > 0),
  date          date not null,
  category_id   uuid references public.categories (id) on delete set null,
  -- pagamento de uma conta: excluir a conta exclui o pagamento junto
  bill_id       uuid unique references public.bills (id) on delete cascade,
  created_at    timestamptz not null default now(),
  check (bill_id is null or type = 'out')
);
create index transactions_company_date_idx on public.transactions (company_id, date);

create table public.goals (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references public.companies (id) on delete cascade,
  title          text not null check (char_length(trim(title)) between 1 and 120),
  target_cents   bigint not null check (target_cents > 0),
  current_cents  bigint not null default 0 check (current_cents >= 0),
  deadline       date not null,
  created_at     timestamptz not null default now()
);
create index goals_company_idx on public.goals (company_id);

create table public.reminders (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies (id) on delete cascade,
  title       text not null check (char_length(trim(title)) between 1 and 200),
  notes       text check (notes is null or char_length(notes) <= 1000),
  date        date not null,
  priority    text not null default 'media' check (priority in ('baixa', 'media', 'alta')),
  done        boolean not null default false,
  created_at  timestamptz not null default now()
);
create index reminders_company_date_idx on public.reminders (company_id, date);

-- ---------------------------------------------------------------------
-- Funções auxiliares das regras de acesso
-- (security definer para poderem ler `profiles` sem recursão de RLS)
-- ---------------------------------------------------------------------

create function public.my_company_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select company_id from public.profiles where user_id = auth.uid()
$$;

create function public.my_role() returns text
language sql stable security definer set search_path = '' as $$
  select role from public.profiles where user_id = auth.uid()
$$;

create function public.can_edit() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select role in ('admin', 'financeiro') from public.profiles where user_id = auth.uid()), false)
$$;

create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select role = 'admin' from public.profiles where user_id = auth.uid()), false)
$$;

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------

alter table public.companies    enable row level security;
alter table public.profiles     enable row level security;
alter table public.invitations  enable row level security;
alter table public.categories   enable row level security;
alter table public.bills        enable row level security;
alter table public.transactions enable row level security;
alter table public.goals        enable row level security;
alter table public.reminders    enable row level security;

-- Empresa: todos da empresa leem; só o admin renomeia.
create policy "empresa: membros leem" on public.companies
  for select to authenticated using (id = public.my_company_id());
create policy "empresa: admin edita" on public.companies
  for update to authenticated using (id = public.my_company_id() and public.is_admin())
  with check (id = public.my_company_id());

-- Perfis: membros da empresa se enxergam; cada um só altera o próprio nome.
-- Criar, mudar perfil de acesso e remover membros é feito pelas funções abaixo.
create policy "perfis: membros leem" on public.profiles
  for select to authenticated using (company_id = public.my_company_id());
create policy "perfis: cada um edita o próprio nome" on public.profiles
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Convites: só o admin vê, cria e cancela.
create policy "convites: admin le" on public.invitations
  for select to authenticated using (company_id = public.my_company_id() and public.is_admin());
create policy "convites: admin cria" on public.invitations
  for insert to authenticated with check (company_id = public.my_company_id() and public.is_admin());
create policy "convites: admin cancela" on public.invitations
  for delete to authenticated using (company_id = public.my_company_id() and public.is_admin() and accepted_at is null);

-- Dados financeiros: membros leem; Administrador e Financeiro gravam.
do $$
declare t text;
begin
  foreach t in array array['categories', 'bills', 'transactions', 'goals', 'reminders'] loop
    execute format('create policy "%1$s: membros leem" on public.%1$I for select to authenticated using (company_id = public.my_company_id())', t);
    execute format('create policy "%1$s: editores criam" on public.%1$I for insert to authenticated with check (company_id = public.my_company_id() and public.can_edit())', t);
    execute format('create policy "%1$s: editores alteram" on public.%1$I for update to authenticated using (company_id = public.my_company_id() and public.can_edit()) with check (company_id = public.my_company_id())', t);
    execute format('create policy "%1$s: editores excluem" on public.%1$I for delete to authenticated using (company_id = public.my_company_id() and public.can_edit())', t);
  end loop;
end $$;

-- Categoria/conta usada numa linha precisa ser da mesma empresa.
create function public.check_same_company() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.category_id is not null and not exists (
    select 1 from public.categories c where c.id = new.category_id and c.company_id = new.company_id
  ) then
    raise exception 'Categoria de outra empresa.';
  end if;
  -- (if separado: na tabela bills não existe a coluna bill_id)
  if tg_table_name = 'transactions' then
    if new.bill_id is not null and not exists (
      select 1 from public.bills b where b.id = new.bill_id and b.company_id = new.company_id
    ) then
      raise exception 'Conta de outra empresa.';
    end if;
  end if;
  return new;
end $$;
create trigger bills_same_company before insert or update on public.bills
  for each row execute function public.check_same_company();
create trigger transactions_same_company before insert or update on public.transactions
  for each row execute function public.check_same_company();

-- ---------------------------------------------------------------------
-- Permissões das tabelas (somente usuários logados; nada para anônimos)
-- ---------------------------------------------------------------------

revoke all on all tables in schema public from anon;
grant select, update on public.companies to authenticated;
grant select on public.profiles to authenticated;
grant update (name) on public.profiles to authenticated;
grant select, insert, delete on public.invitations to authenticated;
grant select, insert, update, delete on public.categories, public.bills, public.transactions, public.goals, public.reminders to authenticated;

-- ---------------------------------------------------------------------
-- Conta paga <-> saída no caixa
-- ---------------------------------------------------------------------

-- Marca a conta como paga: cria a saída no caixa e, se for recorrente, a próxima conta.
create function public.pay_bill(p_bill_id uuid, p_paid_at date default current_date) returns void
language plpgsql security invoker set search_path = '' as $$
declare
  b public.bills;
  next_id uuid;
begin
  select * into b from public.bills where id = p_bill_id for update;
  if not found then raise exception 'Conta não encontrada.'; end if;
  if b.paid_at is not null then return; end if;

  insert into public.transactions (company_id, type, description, amount_cents, date, category_id, bill_id)
  values (b.company_id, 'out', b.description, b.amount_cents, p_paid_at, b.category_id, b.id);

  if b.recurrence <> 'none' then
    insert into public.bills (company_id, description, amount_cents, due_date, category_id, supplier, recurrence, remind_days_before)
    values (
      b.company_id, b.description, b.amount_cents,
      (b.due_date + case when b.recurrence = 'monthly' then interval '1 month' else interval '1 year' end)::date,
      b.category_id, b.supplier, b.recurrence, b.remind_days_before
    )
    returning id into next_id;
  end if;

  update public.bills set paid_at = p_paid_at, next_bill_id = next_id where id = b.id;
end $$;

-- Desfaz o pagamento: remove a saída e a próxima conta recorrente (se ainda não paga).
create function public.unpay_bill(p_bill_id uuid) returns void
language plpgsql security invoker set search_path = '' as $$
declare b public.bills;
begin
  select * into b from public.bills where id = p_bill_id for update;
  if not found then raise exception 'Conta não encontrada.'; end if;
  delete from public.transactions where bill_id = b.id;
  update public.bills set paid_at = null, next_bill_id = null where id = b.id;
  if b.next_bill_id is not null then
    delete from public.bills where id = b.next_bill_id and paid_at is null;
  end if;
end $$;

-- Excluir a saída de um pagamento volta a conta para "a pagar".
create function public.on_payment_deleted() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.bill_id is not null then
    update public.bills set paid_at = null where id = old.bill_id;
  end if;
  return old;
end $$;
create trigger transactions_payment_deleted after delete on public.transactions
  for each row execute function public.on_payment_deleted();

-- Editar uma conta paga atualiza a saída; editar a saída atualiza a conta.
create function public.sync_bill_payment() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if pg_trigger_depth() > 1 then return new; end if; -- evita um atualizar o outro em laço
  if tg_table_name = 'bills' then
    update public.transactions
       set description = new.description, amount_cents = new.amount_cents, category_id = new.category_id
     where bill_id = new.id;
  elsif new.bill_id is not null then
    update public.bills
       set description = new.description, amount_cents = new.amount_cents, category_id = new.category_id, paid_at = new.date
     where id = new.bill_id;
  end if;
  return new;
end $$;
create trigger bills_sync_payment after update of description, amount_cents, category_id on public.bills
  for each row execute function public.sync_bill_payment();
create trigger transactions_sync_bill after update of description, amount_cents, category_id, date on public.transactions
  for each row execute function public.sync_bill_payment();

-- ---------------------------------------------------------------------
-- Cadastro e equipe
-- ---------------------------------------------------------------------

-- Chamada logo depois do cadastro (signUp). Se existir convite para o e-mail,
-- entra na empresa do convite; senão, cria uma empresa nova com a pessoa como admin.
create function public.complete_signup(p_name text, p_company_name text default null)
returns public.profiles
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  user_email text := lower(auth.jwt() ->> 'email');
  inv public.invitations;
  new_company uuid;
  result public.profiles;
begin
  if uid is null then raise exception 'Não autenticado.'; end if;

  select * into result from public.profiles where user_id = uid;
  if found then return result; end if;

  select * into inv from public.invitations where email = user_email and accepted_at is null;
  if found then
    insert into public.profiles (user_id, company_id, name, email, role)
    values (uid, inv.company_id, trim(p_name), user_email, inv.role)
    returning * into result;
    update public.invitations set accepted_at = now() where id = inv.id;
    return result;
  end if;

  if p_company_name is null or char_length(trim(p_company_name)) = 0 then
    raise exception 'Informe o nome da empresa.';
  end if;

  insert into public.companies (name) values (trim(p_company_name)) returning id into new_company;
  insert into public.profiles (user_id, company_id, name, email, role)
  values (uid, new_company, trim(p_name), user_email, 'admin')
  returning * into result;

  insert into public.categories (company_id, name, type, color)
  select new_company, c.name, c.type, c.color
  from (values
    ('Aluguel', 'out', '#0F766E'), ('Energia e água', 'out', '#2563EB'), ('Internet e telefone', 'out', '#7C3AED'),
    ('Fornecedores', 'out', '#DB2777'), ('Folha de pagamento', 'out', '#D97706'), ('Impostos', 'out', '#DC2626'),
    ('Marketing', 'out', '#0891B2'), ('Outros', 'out', '#65A30D'),
    ('Vendas', 'in', '#7C3AED'), ('Serviços', 'in', '#DB2777'), ('Investimentos', 'in', '#D97706'), ('Outras receitas', 'in', '#DC2626')
  ) as c(name, type, color);

  return result;
end $$;

-- Muda o perfil de acesso de um membro (só admin; a empresa nunca fica sem admin).
create function public.set_member_role(p_user_id uuid, p_role text) returns void
language plpgsql security definer set search_path = '' as $$
declare company uuid := public.my_company_id();
begin
  if not public.is_admin() then raise exception 'Somente administradores podem alterar perfis.'; end if;
  if p_role not in ('admin', 'financeiro', 'leitura') then raise exception 'Perfil inválido.'; end if;
  if p_role <> 'admin' and (select role from public.profiles where user_id = p_user_id and company_id = company) = 'admin'
     and (select count(*) from public.profiles where company_id = company and role = 'admin') <= 1 then
    raise exception 'A empresa precisa de pelo menos um administrador.';
  end if;
  update public.profiles set role = p_role where user_id = p_user_id and company_id = company;
  if not found then raise exception 'Membro não encontrado.'; end if;
end $$;

-- Remove um membro da empresa (só admin; a empresa nunca fica sem admin).
-- A conta de login continua existindo, mas sem perfil ela não acessa mais nenhum dado.
create function public.remove_member(p_user_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare company uuid := public.my_company_id();
begin
  if not public.is_admin() then raise exception 'Somente administradores podem remover membros.'; end if;
  if (select role from public.profiles where user_id = p_user_id and company_id = company) = 'admin'
     and (select count(*) from public.profiles where company_id = company and role = 'admin') <= 1 then
    raise exception 'A empresa precisa de pelo menos um administrador.';
  end if;
  delete from public.profiles where user_id = p_user_id and company_id = company;
  if not found then raise exception 'Membro não encontrado.'; end if;
end $$;

-- Funções só podem ser chamadas por usuários logados.
revoke execute on all functions in schema public from public, anon;
grant execute on function
  public.my_company_id(), public.my_role(), public.can_edit(), public.is_admin(),
  public.pay_bill(uuid, date), public.unpay_bill(uuid),
  public.complete_signup(text, text), public.set_member_role(uuid, text), public.remove_member(uuid)
to authenticated;
