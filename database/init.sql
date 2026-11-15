CREATE TABLE IF NOT EXISTS services (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'unknown',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS incidents (
    id SERIAL PRIMARY KEY,
    service_id INTEGER REFERENCES services(id),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    severity VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(30) DEFAULT 'open',
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS recovery_events (
    id SERIAL PRIMARY KEY,
    incident_id INTEGER REFERENCES incidents(id),
    action VARCHAR(200) NOT NULL,
    result VARCHAR(30) NOT NULL,
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS infrastructure_metrics (
    id SERIAL PRIMARY KEY,
    service_name VARCHAR(100),
    cpu_usage NUMERIC(6,2),
    memory_usage NUMERIC(6,2),
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO services (name, description)
VALUES
    ('User API', 'Handles user-related requests'),
    ('Product API', 'Handles product-related requests'),
    ('Notification API', 'Handles notification requests')
ON CONFLICT (name) DO NOTHING;
