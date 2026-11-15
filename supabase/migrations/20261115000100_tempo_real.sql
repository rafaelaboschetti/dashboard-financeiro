-- Publica as alterações das tabelas financeiras no Supabase Realtime, para que
-- uma alteração feita por uma pessoa apareça na hora para as outras da mesma empresa.
-- (O Realtime respeita o RLS: cada pessoa só recebe eventos da própria empresa.)
-- Aplique depois de 20261115000000_schema_inicial.sql.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table
      public.categories, public.bills, public.transactions, public.goals, public.reminders;
  end if;
end $$;
