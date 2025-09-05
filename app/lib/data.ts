import postgres from 'postgres';
import {
  CustomerField,
  customerTableType,
  InvoiceForm,
  invoiceTable,
  LatestInvoiceRaw,
  Revenue,
} from './definitions';
import { formatCurrency } from './utils';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

export async function fetchRevenue() {
  try {
    // Artificially delay a response for demo purposes.
    // Don't do this in production :)

    // console.log('Fetching revenue data...');
    // await new Promise((resolve) => setTimeout(resolve, 3000));

    const data = await sql<Revenue[]>`SELECT * FROM revenue`;

    // console.log('Data fetch completed after 3 seconds.');

    return data;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch revenue data.');
  }
}

export async function fetchLatestinvoice() {
  try {
    const data = await sql<LatestInvoiceRaw[]>`
      SELECT invoice.amount, customer.name, customer.image_url, customer.email, invoice.id
      FROM invoice
      JOIN customer ON invoice.customer_id = customer.id
      ORDER BY invoice.date DESC
      LIMIT 5`;

    const latestinvoice = data.map((invoice) => ({
      ...invoice,
      amount: formatCurrency(invoice.amount),
    }));
    return latestinvoice;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch the latest invoice.');
  }
}

export async function fetchCardData() {
  try {
    // You can probably combine these into a single SQL query
    // However, we are intentionally splitting them to demonstrate
    // how to initialize multiple queries in parallel with JS.
    const invoiceCountPromise = sql`SELECT COUNT(*) FROM invoice`;
    const customerCountPromise = sql`SELECT COUNT(*) FROM customer`;
    const invoicetatusPromise = sql`SELECT
         SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) AS "paid",
         SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) AS "pending"
         FROM invoice`;

    const data = await Promise.all([
      invoiceCountPromise,
      customerCountPromise,
      invoicetatusPromise,
    ]);

    const numberOfinvoice = Number(data[0][0].count ?? '0');
    const numberOfcustomer = Number(data[1][0].count ?? '0');
    const totalPaidinvoice = formatCurrency(data[2][0].paid ?? '0');
    const totalPendinginvoice = formatCurrency(data[2][0].pending ?? '0');

    return {
      numberOfcustomer,
      numberOfinvoice,
      totalPaidinvoice,
      totalPendinginvoice,
    };
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch card data.');
  }
}

const ITEMS_PER_PAGE = 6;
export async function fetchFilteredinvoice(
  query: string,
  currentPage: number,
) {
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  try {
    const invoice = await sql<invoiceTable[]>`
      SELECT
        invoice.id,
        invoice.amount,
        invoice.date,
        invoice.status,
        customer.name,
        customer.email,
        customer.image_url
      FROM invoice
      JOIN customer ON invoice.customer_id = customer.id
      WHERE
        customer.name ILIKE ${`%${query}%`} OR
        customer.email ILIKE ${`%${query}%`} OR
        invoice.amount::text ILIKE ${`%${query}%`} OR
        invoice.date::text ILIKE ${`%${query}%`} OR
        invoice.status ILIKE ${`%${query}%`}
      ORDER BY invoice.date DESC
      LIMIT ${ITEMS_PER_PAGE} OFFSET ${offset}
    `;

    return invoice;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoice.');
  }
}

export async function fetchinvoicePages(query: string) {
  try {
    const data = await sql`SELECT COUNT(*)
    FROM invoice
    JOIN customer ON invoice.customer_id = customer.id
    WHERE
      customer.name ILIKE ${`%${query}%`} OR
      customer.email ILIKE ${`%${query}%`} OR
      invoice.amount::text ILIKE ${`%${query}%`} OR
      invoice.date::text ILIKE ${`%${query}%`} OR
      invoice.status ILIKE ${`%${query}%`}
  `;

    const totalPages = Math.ceil(Number(data[0].count) / ITEMS_PER_PAGE);
    return totalPages;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch total number of invoice.');
  }
}

export async function fetchInvoiceById(id: string) {
  try {
    const data = await sql<InvoiceForm[]>`
      SELECT
        invoice.id,
        invoice.customer_id,
        invoice.amount,
        invoice.status
      FROM invoice
      WHERE invoice.id = ${id};
    `;

    const invoice = data.map((invoice) => ({
      ...invoice,
      // Convert amount from cents to dollars
      amount: invoice.amount / 100,
    }));

    return invoice[0];
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoice.');
  }
}

export async function fetchcustomer() {
  try {
    const customer = await sql<CustomerField[]>`
      SELECT
        id,
        name
      FROM customer
      ORDER BY name ASC
    `;

    return customer;
  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Failed to fetch all customer.');
  }
}

export async function fetchFilteredcustomer(query: string) {
  try {
    const data = await sql<customerTableType[]>`
		SELECT
		  customer.id,
		  customer.name,
		  customer.email,
		  customer.image_url,
		  COUNT(invoice.id) AS total_invoice,
		  SUM(CASE WHEN invoice.status = 'pending' THEN invoice.amount ELSE 0 END) AS total_pending,
		  SUM(CASE WHEN invoice.status = 'paid' THEN invoice.amount ELSE 0 END) AS total_paid
		FROM customer
		LEFT JOIN invoice ON customer.id = invoice.customer_id
		WHERE
		  customer.name ILIKE ${`%${query}%`} OR
        customer.email ILIKE ${`%${query}%`}
		GROUP BY customer.id, customer.name, customer.email, customer.image_url
		ORDER BY customer.name ASC
	  `;

    const customer = data.map((customer) => ({
      ...customer,
      total_pending: formatCurrency(customer.total_pending),
      total_paid: formatCurrency(customer.total_paid),
    }));

    return customer;
  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Failed to fetch customer table.');
  }
}
