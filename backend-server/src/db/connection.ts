// eslint-disable-next-line @typescript-eslint/no-var-requires
const sql: any = require('mssql');

const config = {
  user: 'sa',
  password: 'Str0ngPass!123',
  //server: 'localhost',
  //server: 'host.docker.internal',
  server: 'sqlserver',
  database: 'ClientesDB',
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

export async function getConnection() {
  try {
    const pool = await sql.connect(config);
    return pool;
  } catch (err: unknown) {
    console.error('SQL Connection Error:', err);
    throw err;
  }
}
