do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'initiative_comments_user_fk'
  ) then
    alter table public.initiative_comments
      add constraint initiative_comments_user_fk
      foreign key (user_id) references public.profiles(id) on delete cascade;
  end if;
end $$;
