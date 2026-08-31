create table note (
       id                uuid         primary key,
       interview_id      uuid         not null references interview (id),
       segment_id        uuid         null references interview_segment (id),
       content           text         not null,
       elapsed_seconds   integer      not null,
       created_at        timestamptz  not null,
       updated_at        timestamptz  not null
);

create index idx_note_interview_id on note (interview_id);
