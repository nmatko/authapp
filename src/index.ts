import express, { Request, Response } from 'express';
import pool from './database';
import path from 'path';
import https from 'https';
import fs from 'fs';
import dotenv from 'dotenv';
import { getTicketCount, createTicket, getTicketCountByVatin} from './database';
import { auth, requiresAuth } from 'express-openid-connect';
import QRCode from 'qrcode';
dotenv.config();
const app = express();

const externalUrl = process.env.RENDER_EXTERNAL_URL;
const port = externalUrl && process.env.PORT ? parseInt(process.env.PORT) : 4080;
if (externalUrl) {
  const hostname = '0.0.0.0'; //ne 127.0.0.1
  app.listen(port, hostname, () => {
  console.log(`Server locally running at http://${hostname}:${port}/ and from
  outside on ${externalUrl}`);
  })
} else {
  // Pokreni HTTPS server lokalno
  https.createServer({
    key: fs.readFileSync('ssl/server.key'),
    cert: fs.readFileSync('ssl/server.cert')
  }, app).listen(port, () => {
    console.log(`Server running securely at https://localhost:${port}/`);
  });
}

// Definiraj config bazu URL-a
const config = {
  authRequired: false, // Ne traži login za svaki pristup
  auth0Logout: true,
  secret: process.env.CLIENT_SECRET!,
  clientID: process.env.CLIENT_ID!,
  issuerBaseURL: process.env.ISSUER_BASE_URL!,
  baseURL: externalUrl || `https://localhost:${port}`
};

app.use(auth(config));
app.use(express.json());
app.use(express.urlencoded({ extended: true })); 

console.log(`Base URL is set to ${config.baseURL}`);


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
// Postavljanje Pug kao view engine
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// Static files 
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', async (req: Request, res: Response) => {
  try {
    const totalTickets = await getTicketCount();
    res.render('index', { totalTickets , isAuthenticated: req.oidc.isAuthenticated() });
  } catch (error) {
    res.status(500).send('Error fetching ticket count');
  }
});

// Ruta za autentifikaciju i preusmjeravanje na formu
app.get('/generate-ticket', (req, res) => {
  if (req.oidc.isAuthenticated()) {
    res.redirect('/ticket-form'); // Preusmjeri na formu ako je korisnik već autentificiran
  } else {
    res.oidc.login({ returnTo: '/ticket-form' }); // Pokreće Auth0 login proces
  }
});

// Ruta za prikaz forme za unos podataka nakon autentifikacije
app.get('/ticket-form', requiresAuth(), (req, res) => {
  
  res.render('ticket-form');
});
app.post('/submit-ticket', requiresAuth(), async (req: Request, res: Response): Promise<any> => {
  console.log(req.body);
  const { vatin, firstName, lastName } = req.body;
  const user = req.oidc.user;

  if (!/^\d{11}$/.test(vatin)) {
    return res.status(400).send('VATIN must be exactly 11 digits.');
  }
  if (!user) {
    res.status(401).send('User not authenticated');
    return
  }
  if(!vatin || !firstName || !lastName || !user.nickname){
    res.status(400).send('One of the necessary properties not set');
  }
  try {
    // Kreiraj ulaznicu koristeći podatke iz forme
    const ticketCountVatin = await getTicketCountByVatin(vatin)
    if(ticketCountVatin < 3){
    const ticketId = await createTicket(vatin.toString(), firstName, lastName, user.nickname);
    console.log(ticketId)
    console.log(`Base URL: ${config.baseURL}`);

    const ticketUrl =config.baseURL + "/ticket/" + ticketId;
    console.log(ticketUrl)
    const qrCode = await QRCode.toDataURL(ticketUrl);

    res.render('ticket-success', { qrCode, ticketUrl });
  }else {
    res.status(400).send('Maximum number of tickets claimed for the entered vatin (3)');
  }
  } catch (error ) {
    console.log((error as any).code)
    res.status(400).send('Failed to generate ticket');
  }
});
app.get('/ticket/:id', requiresAuth(), async (req: Request, res: Response):Promise<any> => {
  const { id } = req.params;
  const user = req.oidc.user;
  try {
    console.log('Ticket ID:', id);  // Ispis za praćenje

    // SQL upit bez placeholdera
    const query = `SELECT * FROM tickets WHERE id = '${id}'`;
    const result = await pool.query(query);

    if (result.rows.length === 0) {
      return res.status(404).send('Ticket not found');
    }

    const ticket = result.rows[0];
    if (user && ticket.username !== user.nickname) {
      return res.status(403).send('You do not have access to this ticket');
    }
    res.render('ticket-details', { ticket });
  } catch (error) {
    console.error('Error fetching ticket:', error);
    res.status(500).send('Error retrieving ticket');
  }
});

app.get('/logout', (req: Request, res: Response) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid'); // Očisti sesijski kolačić
    res.redirect('/'); // Preusmjeri korisnika na početnu stranicu
  });
});
