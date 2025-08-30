const CREATE: string = `
  CREATE TABLE IF NOT EXISTS weather (
    id SERIAL PRIMARY KEY,
    temperature NUMERIC NOT NULL,
    rpm NUMERIC NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`;

const INSERT: string = `
      INSERT INTO weather (temperature, rpm, created_at)
      VALUES ($1, $2, NOW())
      RETURNING *;
      `;

const SELECT_BY_DATE: string = `
      SELECT *
      FROM weather
      WHERE DATE(created_at) = COALESCE($1::date, CURRENT_DATE)
      ORDER BY created_at DESC;
      `;

export { CREATE, INSERT, SELECT_BY_DATE };
