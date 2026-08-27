

create table interview (
       id                   uuid         primary key,
       organization_id      uuid         not null,
       recruiter_id         uuid         not null,
       candidate_id         uuid         not null,
       job_position_id      uuid         null,
       scheduled_start      timestamptz  not null,
       duration_minutes     integer      not null,
       status               varchar(20)  not null,
       admitted             boolean      not null default false,
       cancelled_at         timestamptz  null,
       reminder24h_sent_at  timestamptz  null,
       reminder1h_sent_at   timestamptz  null
);

create table interview_segment (
       id                   uuid         primary key,
       interview_id         uuid         not null references interview (id),
       title                varchar(255) not null,
       order_index          integer      not null,
       planned_minutes      integer      not null,
       prepared_questions   jsonb        not null default '[]'::jsonb,
       actual_start         timestamptz  null,
       actual_end           timestamptz  null
);

create index idx_interview_organization_id on interview (organization_id);
create index idx_interview_segment_interview_id on interview_segment (interview_id);