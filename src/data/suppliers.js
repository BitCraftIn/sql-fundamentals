import { getDb } from '../db/utils';
import { sql } from '../sql-string';

/**
 * Columns to select in the `getAllSuppliers` query
 */
const ALL_SUPPLIERS_COLUMNS = ['id', 'contactname', 'companyname'];

/**
 * Retrieve a collection of all Supplier records from the database
 * @return {Promise<Supplier[]>}
 */
export async function getAllSuppliers() {
  const db = await getDb();
  return await db.all(sql`
SELECT ${ALL_SUPPLIERS_COLUMNS.map(sname => `s.${sname}`).join(
    ','
  )} , group_concat(p.productname ORDER BY p.productname ASC SEPARATOR ', ') as productlist
FROM Supplier as s
  inner join Product as p on p.supplierid = s.id
  group by s.id`);
}

/**
 * Retrieve an individual Supplier record from the database, by id
 * @param {string|number} id Supplier id
 * @return {Promise<Supplier>} the supplier
 */
export async function getSupplier(id) {
  const db = await getDb();
  return await db.get(
    sql`
SELECT *
FROM Supplier
WHERE id = $1`,
    id
  );
}
