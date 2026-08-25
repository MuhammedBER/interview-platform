CREATE TABLE organization (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE recruiter (
    id UUID PRIMARY KEY,
    keycloak_subject VARCHAR(255) NOT NULL UNIQUE,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    organization_id UUID NOT NULL,
    constraint fk_recruiter_organization foreign key (organization_id) references organization(id)
);

CREATE TABLE candidate (
    id UUID PRIMARY KEY,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    organization_id UUID NOT NULL,
    CONSTRAINT uq_candidate_email_per_org UNIQUE (organization_id, email),
    CONSTRAINT fk_candidate_organization FOREIGN KEY (organization_id) REFERENCES organization(id)
);

CREATE INDEX idx_recruiter_organization_id ON recruiter (organization_id);
CREATE INDEX idx_candidate_organization_id ON candidate (organization_id);