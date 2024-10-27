import { Pool, QueryConfig } from 'node-postgres';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  port: Number(process.env.DB_PORT),
  ssl: true
});

// Funkcija za dohvaćanje svih događaja
// Funkcija za dohvaćanje broja ulaznica iz baze podataka
export const getTicketCount = async (): Promise<number> => {
  try {
    const result = await pool.query('SELECT COUNT(*) FROM tickets');
    return parseInt(result.rows[0].count, 10); // Vraćamo broj ulaznica kao broj
  } catch (error) {
    console.error('Error fetching ticket count:', error);
    throw error;
  }
};
/*export const createTicket = async (vatin: string, firstName: string, lastName: string, username: string)=> {
  try {


    const query:QueryConfig = {
      text: 'INSERT INTO tickets (vatin, firstname, lastname, username) VALUES ($1, $2, $3, $4) RETURNING id',
      values: [vatin.toString(), firstName, lastName, username],
    };

    console.log('Executing query with parameters:', query.values);

    const result = await pool.query(query);
    console.log('Ticket created with ID:', result.rows[0].id);

    return result.rows[0].id;
  } catch (error) {
    console.error('Error in createTicket:', error);
    throw new Error('Failed to create ticket');
  }
};*/
export const createTicket = async (vatin: string, firstName: string, lastName: string, username: string): Promise<any> => {
  try {
    // Ovdje se koriste direktno unesene vrijednosti umjesto placeholdera
    const query = `
      INSERT INTO tickets (vatin, firstname, lastname, username)
      VALUES ('${vatin}', '${firstName}', '${lastName}', '${username}') RETURNING id
    `;

    console.log(`Executing query: ${query}`);

    const result = await pool.query(query);

    return result.rows[0].id;
  } catch (error) {
    console.error('Error in createTicket:', error);

  }
};
export const getTicketCountByVatin = async (vatin: string): Promise<number> => {
  try {
    const query = `SELECT COUNT(*) FROM tickets WHERE vatin = '${vatin}'`;
    const result = await pool.query(query, [vatin]);

    // Broj ticketa se nalazi u prvom retku rezultata, prvi stupac
    const count = parseInt(result.rows[0].count, 10);
    return count;
  } catch (error) {
    console.error('Error fetching ticket count by VATIN:', error);
    throw new Error('Failed to retrieve ticket count');
  }
};


export default pool;
