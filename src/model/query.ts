const CREATE: string = `
      INSERT INTO your_table (temperature, rpm, kwh, voltage, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING *;
      `;

const SELECT_BY_DATE: string =  `
      SELECT *
      FROM your_table
      WHERE DATE(created_at) = COALESCE($1::date, CURRENT_DATE)
      ORDER BY created_at DESC;
      `;

export { CREATE, SELECT_BY_DATE };