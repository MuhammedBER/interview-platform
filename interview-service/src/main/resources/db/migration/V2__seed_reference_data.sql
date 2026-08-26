
INSERT INTO organization (id, name) VALUES
('11111111-1111-1111-1111-111111111111', 'Alpha'),
('22222222-2222-2222-2222-222222222222', 'Beta');

INSERT INTO recruiter (id, organization_id, keycloak_subject, first_name, last_name, email) VALUES
(gen_random_uuid(), '11111111-1111-1111-1111-111111111111','050f8714-8fd9-4944-b9b2-c8f0bbb4e17f', 'mohamed', 'rh',  'recruiter1@alpha.test'),
(gen_random_uuid(), '22222222-2222-2222-2222-222222222222','1c2ae273-2ad2-4a48-8ef3-a633f0f46dd3', 'mohamed', 'rh2', 'recruiter2@beta.test');