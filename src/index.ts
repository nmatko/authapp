import express, { Request, Response } from 'express';
import pool from './database';


const app = express();

const externalUrl = process.env.RENDER_EXTERNAL_URL;
const port = externalUrl && process.env.PORT ? parseInt(process.env.PORT) : 4080;
if (externalUrl) {
  const hostname = '0.0.0.0'; //ne 127.0.0.1
  app.listen(port, hostname, () => {
  console.log(`Server locally running at http://${hostname}:${port}/ and from
  outside on ${externalUrl}`);
  })
}
const config = {
  baseURL: externalUrl || `https://localhost:${port}`,
}
/*else {
  https.createServer({
  key: fs.readFileSync('server.key'),
  cert: fs.readFileSync('server.cert')
  }, app)
  .listen(port, function () {
  console.log(`Server running at https://localhost:${port}/`);
  })*/
app.get('/', (req: Request, res: Response) => {
  res.send('Hello from TypeScript!');
});

const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('Connected to the database');
    
    // Testiranje upita
    const result = await client.query('SELECT NOW()');
    console.log('Current timestamp from database:', result.rows[0].now);

    client.release();
  } catch (err) {
    console.error('Error connecting to the database:', err);
  }
};

testConnection();