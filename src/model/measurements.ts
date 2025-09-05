// ==============================
// Configurable Names
// ==============================
export const TABLE_NAME = "measurements";
export const ARCHIVE_TABLE_NAME = `archived_${TABLE_NAME}`;
export const HOURLY_VIEW_NAME = `${TABLE_NAME}_1h`;
export const DAILY_VIEW_NAME = `${TABLE_NAME}_1d`;
export const UNIFIED_VIEW_NAME = `all_${TABLE_NAME}`;

export const RETENTION_DAYS = 30; // keep raw for 30 days
export const HOURLY_AGG_THRESHOLD = 30; // >30 days → use hourly aggregates
export const DAILY_AGG_THRESHOLD = 180; // >180 days → use daily aggregates

// ==============================
// Create Tables
// ==============================
export const CREATE_MEASUREMENTS_TABLE = `
  CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
    id SERIAL PRIMARY KEY,
    sensor_type TEXT NOT NULL,
    value NUMERIC NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_${TABLE_NAME}_sensor_time
    ON ${TABLE_NAME} (sensor_type, created_at);

  CREATE INDEX IF NOT EXISTS idx_${TABLE_NAME}_created_at
    ON ${TABLE_NAME} (created_at);

  -- Prevent duplicate rows per sensor + timestamp
  CREATE UNIQUE INDEX IF NOT EXISTS idx_${TABLE_NAME}_unique
    ON ${TABLE_NAME} (sensor_type, created_at);
`;

export const CREATE_ARCHIVE_TABLE = `
  CREATE TABLE IF NOT EXISTS ${ARCHIVE_TABLE_NAME} (
    id SERIAL PRIMARY KEY,
    sensor_type TEXT NOT NULL,
    value NUMERIC NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_${ARCHIVE_TABLE_NAME}_sensor_time
    ON ${ARCHIVE_TABLE_NAME} (sensor_type, created_at);

  CREATE INDEX IF NOT EXISTS idx_${ARCHIVE_TABLE_NAME}_created_at
    ON ${ARCHIVE_TABLE_NAME} (created_at);

  -- Prevent duplicate rows per sensor + timestamp
  CREATE UNIQUE INDEX IF NOT EXISTS idx_${ARCHIVE_TABLE_NAME}_unique
    ON ${ARCHIVE_TABLE_NAME} (sensor_type, created_at);
`;

// ==============================
// Unified View
// ==============================
export const CREATE_UNIFIED_VIEW = `
  CREATE OR REPLACE VIEW ${UNIFIED_VIEW_NAME} AS
  SELECT id, sensor_type, value, created_at, false AS archived
  FROM ${TABLE_NAME}
  UNION ALL
  SELECT id, sensor_type, value, created_at, true AS archived
  FROM ${ARCHIVE_TABLE_NAME};
`;

// ==============================
// Insert (safe dedup)
// ==============================
export const INSERT_MEASUREMENT = `
  INSERT INTO ${TABLE_NAME} (sensor_type, value, created_at)
  VALUES ($1, $2, COALESCE($3, NOW()))
  ON CONFLICT (sensor_type, created_at) DO NOTHING
  RETURNING *;
`;

// ==============================
// Range Queries (Raw + Archive + Aggregates)
// ==============================
export const SELECT_BY_RANGE = (source: string) => {
  if (source === HOURLY_VIEW_NAME || source === DAILY_VIEW_NAME) {
    return `
      SELECT 
        sensor_type,
        bucket AS created_at,
        min_value,
        max_value,
        avg_value,
        samples
      FROM ${source}
      WHERE bucket BETWEEN $1::timestamptz AND $2::timestamptz
      ORDER BY bucket ASC;
    `;
  }

  return `
    SELECT 
      sensor_type,
      id,
      value,
      created_at,
      ${source.includes("archived") ? "true" : source.includes(TABLE_NAME) ? "false" : "archived"} AS archived
    FROM ${source}
    WHERE created_at BETWEEN $1::timestamptz AND $2::timestamptz
    ORDER BY created_at ASC;
  `;
};

export const SELECT_BY_TYPE_AND_RANGE = (source: string) => {
  if (source === HOURLY_VIEW_NAME || source === DAILY_VIEW_NAME) {
    return `
      SELECT 
        sensor_type,
        bucket AS created_at,
        min_value,
        max_value,
        avg_value,
        samples
      FROM ${source}
      WHERE sensor_type = $1
        AND bucket BETWEEN $2::timestamptz AND $3::timestamptz
      ORDER BY bucket ASC;
    `;
  }

  return `
    SELECT 
      sensor_type,
      id,
      value,
      created_at,
      ${source.includes("archived") ? "true" : source.includes(TABLE_NAME) ? "false" : "archived"} AS archived
    FROM ${source}
    WHERE sensor_type = $1
      AND created_at BETWEEN $2::timestamptz AND $3::timestamptz
    ORDER BY created_at ASC;
  `;
};

// ==============================
// Aggregates
// ==============================
export const CREATE_HOURLY_AGG_VIEW = `
  CREATE MATERIALIZED VIEW IF NOT EXISTS ${HOURLY_VIEW_NAME} AS
  SELECT 
    sensor_type,
    date_trunc('hour', created_at) AS bucket,
    min(value) AS min_value,
    max(value) AS max_value,
    avg(value) AS avg_value,
    count(*) AS samples
  FROM ${UNIFIED_VIEW_NAME}
  GROUP BY sensor_type, date_trunc('hour', created_at);

  CREATE UNIQUE INDEX IF NOT EXISTS idx_${HOURLY_VIEW_NAME}_unique
    ON ${HOURLY_VIEW_NAME} (sensor_type, bucket);
`;

export const CREATE_DAILY_AGG_VIEW = `
  CREATE MATERIALIZED VIEW IF NOT EXISTS ${DAILY_VIEW_NAME} AS
  SELECT 
    sensor_type,
    date_trunc('day', created_at) AS bucket,
    min(value) AS min_value,
    max(value) AS max_value,
    avg(value) AS avg_value,
    count(*) AS samples
  FROM ${UNIFIED_VIEW_NAME}
  GROUP BY sensor_type, date_trunc('day', created_at);

  CREATE UNIQUE INDEX IF NOT EXISTS idx_${DAILY_VIEW_NAME}_unique
    ON ${DAILY_VIEW_NAME} (sensor_type, bucket);
`;

export const REFRESH_HOURLY_AGG_VIEW = `
  REFRESH MATERIALIZED VIEW CONCURRENTLY ${HOURLY_VIEW_NAME};
`;

export const REFRESH_DAILY_AGG_VIEW = `
  REFRESH MATERIALIZED VIEW CONCURRENTLY ${DAILY_VIEW_NAME};
`;

// ==============================
// Retention
// ==============================
// Archive old data safely (ignore duplicates)
export const ARCHIVE_OLD_DATA = (days: number) => `
  INSERT INTO ${ARCHIVE_TABLE_NAME} (sensor_type, value, created_at)
  SELECT sensor_type, value, created_at
  FROM ${TABLE_NAME}
  WHERE created_at < NOW() - INTERVAL '${days} days'
  ON CONFLICT (sensor_type, created_at) DO NOTHING;
`;

// Delete only if successfully archived
export const DELETE_OLD_DATA = (days: number) => `
  DELETE FROM ${TABLE_NAME} m
  WHERE created_at < NOW() - INTERVAL '${days} days'
    AND EXISTS (
      SELECT 1
      FROM ${ARCHIVE_TABLE_NAME} a
      WHERE a.sensor_type = m.sensor_type
        AND a.created_at = m.created_at
    );
`;
