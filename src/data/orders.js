import { getDb } from '../db/utils';
import { sql } from '../sql-string';

export const ALL_ORDERS_COLUMNS = [
  'id',
  'customerid',
  'employeeid',
  'shipcity',
  'shipcountry',
  'shippeddate'
];
export const ORDER_COLUMNS = ['*'];

/**
 * @typedef OrderCollectionOptions
 * @property {number} page Page number (zero-indexed)
 * @property {number} perPage Results per page
 * @property {string} sort Property to sort by
 * @property {'asc'|'desc'} order Sort direction
 * @description Options that may be used to customize a query for a collection of CustomerOrder records
 */

/**
 * Defaults values to use when parts of OrderCollectionOptions are not provided
 * @type {Readonly<OrderCollectionOptions>}
 */
const DEFAULT_ORDER_COLLECTION_OPTIONS = Object.freeze(
  /** @type {OrderCollectionOptions}*/ ({
    order: 'asc',
    page: 1,
    perPage: 20,
    sort: 'id'
  })
);

/**
 * Retrieve a collection of "all orders" from the database.
 * NOTE: This table has tens of thousands of records, so we'll probably have to apply
 *    some strategy for viewing only a part of the collection at any given time
 * @param {Partial<OrderCollectionOptions>} opts Options for customizing the query
 * @returns {Promise<Order[]>} the orders
 */
export async function getAllOrders(opts = {}, whereClause) {
  // Combine the options passed into the function with the defaults

  /** @type {OrderCollectionOptions} */
  let options = {
    ...DEFAULT_ORDER_COLLECTION_OPTIONS,
    ...opts
  };
  let whereClauses = '';
  whereClauses = sql`ORDER BY co.${options.sort} ${options.order} LIMIT ${
    options.perPage
  } OFFSET ${(options.page - 1) * options.perPage}`;

  const db = await getDb();
  return await db.all(sql`
SELECT ${ALL_ORDERS_COLUMNS.map(x => `co.${x}`).join(
    ','
  )},c.contactname AS customername,e.firstname AS employeename
FROM CustomerOrder  AS co LEFT JOIN   Customer As c ON co.customerid = c.id LEFT JOIN   Employee As e ON co.employeeid = e.id  ${whereClause} ${whereClauses}`);
}

/**
 * Retrieve a list of CustomerOrder records associated with a particular Customer
 * @param {string} customerId Customer id
 * @param {Partial<OrderCollectionOptions>} opts Options for customizing the query
 */
export async function getCustomerOrders(customerId, opts = {}) {
  // ! This is going to retrieve ALL ORDERS, not just the ones that belong to a particular customer. We'll need to fix this
  if (!opts.sort) {
    opts.sort = 'shippeddate';
  }
  return getAllOrders(opts, sql`WHERE co.customerid='${customerId}'`);
}

/**
 * Retrieve an individual CustomerOrder record by id
 * @param {string | number} id CustomerOrder id
 * @returns {Promise<Order>} the order
 */
export async function getOrder(id) {
  const db = await getDb();
  return await db.get(
    sql`
SELECT co.*,c.contactname AS customername,e.firstname AS employeename,
SUM((od.unitprice*od.quantity)*(1-od.discount)) as subtotal
FROM CustomerOrder AS co
LEFT JOIN   Customer AS c ON co.customerid = c.id
LEFT JOIN   Employee AS e ON co.employeeid = e.id
LEFT JOIN OrderDetail AS od ON od.orderid = co.id
WHERE co.id = $1
GROUP BY od.orderid`,
    id
  );
}

/**
 * Get the OrderDetail records associated with a particular CustomerOrder record
 * @param {string | number} id CustomerOrder id
 * @returns {Promise<OrderDetail[]>} the order details
 */
export async function getOrderDetails(id) {
  const db = await getDb();
  return await db.all(
    sql`
SELECT od.*,od.unitprice * od.quantity as price,p.productname
FROM OrderDetail AS od
LEFT JOIN   Product As p ON od.productid = p.id
WHERE od.orderid = $1`,
    id
  );
}

/**
 * Get a CustomerOrder record, and its associated OrderDetails records
 * @param {string | number} id CustomerOrder id
 * @returns {Promise<[Order, OrderDetail[]]>} the order and respective order details
 */
export async function getOrderWithDetails(id) {
  let order = await getOrder(id);
  let items = await getOrderDetails(id);
  return [order, items];
}

/**
 * Create a new CustomerOrder record
 * @param {Pick<Order, 'employeeid' | 'customerid' | 'shipcity' | 'shipaddress' | 'shipname' | 'shipvia' | 'shipregion' | 'shipcountry' | 'shippostalcode' | 'requireddate' | 'freight'>} order data for the new CustomerOrder
 * @param {Array<Pick<OrderDetail, 'productid' | 'quantity' | 'unitprice' | 'discount'>>} details data for any OrderDetail records to associate with this new CustomerOrder
 * @returns {Promise<{id: string}>} the newly created order
 */
export async function createOrder(order, details = []) {
  const db = await getDb();

  const nonEmptyColumns = Object.keys(order).filter(column => {
    if (order[column]) return true;
    return false;
  });
  const values = nonEmptyColumns.map(cname => {
    let val = order[cname];
    if (typeof val === 'string') {
      val = `'${val}'`;
    }
    return val;
  });
  return db
    .run(
      sql`INSERT INTO CustomerOrder
    (${nonEmptyColumns.join(',')})
    values
    (${values.join(',')})`
    )
    .then(async r => {
      let id = 'NOTHING';
      if (r && r.lastID) {
        id = r.lastID;
        const detailsInsertionPromises = details.map(detail => {
          return db.run(
            sql`INSERT INTO OrderDetail (id,orderid,productid,unitprice,quantity,discount)
            values (${id}/${detail.productid},${id},${detail.productid},${detail.unitprice},${
              detail.quantity
            },${detail.discount});`
          );
        });
        await Promise.all(detailsInsertionPromises);
      }
      return { id };
    });
}

/**
 * Delete a CustomerOrder from the database
 * @param {string | number} id CustomerOrder id
 * @returns {Promise<any>}
 */
export async function deleteOrder(id) {
  const db = await getDb();
  await db.run(sql`DELETE FROM CustomerOrder WHERE id=$1`, id);
  // await db.run(sql`DELETE FROM OrderDetail WHERE orderid=$1`, id); // this is not required in solution so i comment it
}

/**
 * Update a CustomerOrder, and its associated OrderDetail records
 * @param {string | number} id CustomerOrder id
 * @param {Pick<Order, 'employeeid' | 'customerid' | 'shipcity' | 'shipaddress' | 'shipname' | 'shipvia' | 'shipregion' | 'shipcountry' | 'shippostalcode' | 'requireddate' | 'freight'>} data data for the new CustomerOrder
 * @param {Array<Pick<OrderDetail, 'id' | 'productid' | 'quantity' | 'unitprice' | 'discount'>>} details data for any OrderDetail records to associate with this new CustomerOrder
 * @returns {Promise<Partial<Order>>} the order
 */
export async function updateOrder(id, data, details = []) {
  return Promise.reject('Orders#updateOrder() NOT YET IMPLEMENTED');
}
