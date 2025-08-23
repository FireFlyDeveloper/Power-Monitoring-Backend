const CREATE: string = `
  CREATE TABLE IF NOT EXISTS measurements (
    id SERIAL PRIMARY KEY,
    temperature NUMERIC NOT NULL,
    rpm NUMERIC NOT NULL,
    kwh NUMERIC NOT NULL,
    voltage NUMERIC NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`;

const INSERT: string = `
      INSERT INTO power (temperature, rpm, kwh, voltage, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING *;
      `;

const SELECT_BY_DATE: string = `
      SELECT *
      FROM power
      WHERE DATE(created_at) = COALESCE($1::date, CURRENT_DATE)
      ORDER BY created_at DESC;
      `;

export { CREATE, SELECT_BY_DATE };
