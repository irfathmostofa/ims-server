// import { Pool } from "pg";
// import { ENV } from "./env";

// const pool = new Pool({
//   connectionString: ENV.DATABASE_URL,
// });

// export default pool;

import { Pool } from "pg";
import { ENV } from "./env";

const pool = new Pool({
  host: ENV.DB_HOST,
  port: ENV.DB_PORT,
  database: ENV.DB_NAME,
  user: ENV.DB_USER,
  password: ENV.DB_PASSWORD,

  max: 5, // low RAM safe
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});


export default pool;
