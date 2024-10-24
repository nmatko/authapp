import express, { Request, Response } from 'express';
import pool from './database';


const app = express();
const port = 3000;

app.get('/', (req: Request, res: Response) => {
  res.send('Hello from TypeScript!');
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
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