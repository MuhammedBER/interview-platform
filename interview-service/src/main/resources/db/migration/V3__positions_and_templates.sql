CREATE TABLE job_position (
id              UUID         PRIMARY KEY,
organization_id UUID         NOT NULL,
name            VARCHAR(255) NOT NULL,
description     TEXT,
status          VARCHAR(20)  NOT NULL,
created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),

CONSTRAINT fk_job_position_organization
    FOREIGN KEY (organization_id) REFERENCES organization(id)
);
CREATE INDEX idx_job_position_organization_id ON job_position (organization_id);

CREATE TABLE template_segment (
id                UUID         PRIMARY KEY,
job_position_id   UUID         NOT NULL,
title             VARCHAR(255) NOT NULL,
order_index       INTEGER      NOT NULL,
planned_minutes   INTEGER      NOT NULL,
default_questions JSONB        NOT NULL DEFAULT '[]',
CONSTRAINT fk_template_segment_job_position
FOREIGN KEY (job_position_id) REFERENCES job_position(id)
);