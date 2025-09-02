// KWH Measurements
export const INSERT_KWH: string = `
      INSERT INTO kwh (kwh, created_at)
      VALUES ($1, NOW())
      RETURNING *;
      `;

// Voltage Measurements
export const INSERT_VOLTAGE: string = `
      INSERT INTO voltage (voltage, created_at)
      VALUES ($1, NOW())
      RETURNING *;
      `;

// Temperature Measurements
export const INSERT_TEMPERATURE: string = `
      INSERT INTO temperature (temperature, created_at)
      VALUES ($1, NOW())
      RETURNING *;
      `;

// RPM Measurements
export const INSERT_RPM: string = `
      INSERT INTO rpm (rpm, created_at)
      VALUES ($1, NOW())
      RETURNING *;
      `;

// Select all measurements by date (KWH, Voltage, Temperature, RPM)
export const SELECT_BY_DATE_ALL: string = `
  SELECT 'kwh' AS type, id, kwh::NUMERIC AS value, created_at
  FROM kwh
  WHERE DATE(created_at) = COALESCE($1::date, CURRENT_DATE)

  UNION ALL

  SELECT 'voltage' AS type, id, voltage::NUMERIC AS value, created_at
  FROM voltage
  WHERE DATE(created_at) = COALESCE($1::date, CURRENT_DATE)

  UNION ALL

  SELECT 'temperature' AS type, id, temperature::NUMERIC AS value, created_at
  FROM temperature
  WHERE DATE(created_at) = COALESCE($1::date, CURRENT_DATE)

  UNION ALL

  SELECT 'rpm' AS type, id, rpm::NUMERIC AS value, created_at
  FROM rpm
  WHERE DATE(created_at) = COALESCE($1::date, CURRENT_DATE)

  ORDER BY created_at DESC;
`;

// Create all measurement tables at once
export const CREATE_ALL_TABLES: string = `
  CREATE TABLE IF NOT EXISTS kwh (
    id SERIAL PRIMARY KEY,
    kwh NUMERIC NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS voltage (
    id SERIAL PRIMARY KEY,
    voltage NUMERIC NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS temperature (
    id SERIAL PRIMARY KEY,
    temperature NUMERIC NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS rpm (
    id SERIAL PRIMARY KEY,
    rpm NUMERIC NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`;
