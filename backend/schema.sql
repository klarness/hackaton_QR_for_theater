create table if not exists users (
  id text primary key,
  name text not null
);

create table if not exists characters (
  id text primary key,
  name text not null,
  model_url text,
  default_animation text
);

create table if not exists quests (
  id text primary key,
  name text not null,
  description text not null,
  start_character_id text not null references characters(id)
);

create table if not exists quest_steps (
  id text primary key,
  quest_id text not null references quests(id),
  step_number integer not null,
  description text not null,
  character_id text not null references characters(id),
  next_character_id text references characters(id)
);

create table if not exists quest_progress (
  user_id text not null references users(id),
  quest_id text not null references quests(id),
  current_step integer not null,
  current_character_id text not null references characters(id),
  status text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, quest_id)
);

create table if not exists dialogues (
  id text primary key,
  character_id text not null references characters(id),
  step_number integer not null,
  npc_text text not null,
  next_character_id text references characters(id)
);
