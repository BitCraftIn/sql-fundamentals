import { getDb } from '../db/utils';
import { sql } from '../sql-string';

/**
 * Columns to SELECT for the getAllCustomers query
 */
const ALL_CUSTOMERS_COLUMNS = ['id', 'contactname', 'companyname'];

/**
 * Options that may be used to customize a query for a collection of Customers
 *
 * @typedef CustomerCollectionOptions
 * @property {string} [filter] name filter string
 */

/**
 * Retrieve an array of Customers from the database
 *
 * @export
 * @param {CustomerCollectionOptions} [options={}] Options that influence the particulars of the "all customers" query
 * @returns {Promise<Customer[]>} A collection of customers
 */
export async function getAllCustomers(options = {}) {
  const db = await getDb();
  let whereClauses = '';
  if (options.filter) {
    whereClauses = sql`WHERE (lower(c.companyName) like lower("%${
      options.filter
    }%")) OR (lower(c.contactName) like lower("%${options.filter}%")) `;
  }
  return await db.all(sql`
SELECT ${ALL_CUSTOMERS_COLUMNS.map(cname => `c.${cname}`).join(',')}, count(co.id) as ordercount
FROM Customer as c join CustomerOrder as co On c.id = co.customerid  ${whereClauses} group by c.id `);
}

/**
 * Retrieve an individual Customer (by Id) from the database
 *
 * @export
 * @param {string | number} id The id of the customer to retrieve
 * @returns {Promise<Customer>} The customer
 */
export async function getCustomer(id) {
  const db = await getDb();
  return await db.get(
    sql`
SELECT *
FROM Customer
WHERE id = $1`,
    id
  );
}
