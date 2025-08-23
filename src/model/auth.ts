const CREATE: string = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
const GET_USER: string = "SELECT password FROM users WHERE username = $1";
const SELECT_USER: string = "SELECT * FROM users WHERE username = $1";
const INSERT_USER: string =
  "INSERT INTO users (username, password) VALUES ($1, $2)";
const UPDATE: string = "UPDATE users SET password = $1 WHERE username = $2";

export { CREATE, GET_USER, SELECT_USER, INSERT_USER, UPDATE };
