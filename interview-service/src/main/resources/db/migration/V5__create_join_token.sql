create table join_token (
    id           uuid        primary key,
    interview_id uuid        not null references interview (id),
    token_hash   varchar(64) not null unique,
    status       varchar(20) not null,
    valid_from   timestamptz not null,
    valid_until  timestamptz not null,
    used_at      timestamptz null,
    revoked_at   timestamptz null,
    created_at   timestamptz not null default now()
);

create index idx_join_token_interview_id on join_token (interview_id);
