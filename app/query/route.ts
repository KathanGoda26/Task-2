// import postgres from 'postgres';

// const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

// async function listinvoice() {
// 	const data = await sql`
//     SELECT invoice.amount, customer.name
//     FROM invoice
//     JOIN customer ON invoice.customer_id = customer.id
//     WHERE invoice.amount = 666;
//   `;

// 	return data;
// }

export async function GET() {
  return Response.json({
    message:
      'Uncomment this file and remove this line. You can delete this file when you are finished.',
  });
  // try {
  // 	return Response.json(await listinvoice());
  // } catch (error) {
  // 	return Response.json({ error }, { status: 500 });
  // }
}
