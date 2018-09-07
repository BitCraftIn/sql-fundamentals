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
export async function getAllOrders(opts = {}, whereClauses) {
  // Combine the options passed into the function with the defaults

  /** @type {OrderCollectionOptions} */
  let options = {
    ...DEFAULT_ORDER_COLLECTION_OPTIONS,
    ...opts
  };
  let orderClauses = '';
  orderClauses = sql`ORDER BY co.${options.sort} ${options.order} LIMIT ${
    options.perPage
  } OFFSET ${(options.page - 1) * options.perPage}`;

  let joinClauses = '';
  joinClauses = sql`SELECT ${ALL_ORDERS_COLUMNS.map(
    x => `co.${x}`
  )}, c.contactname as customername, e.firstname as employeename 
  FROM CustomerOrder as co 
  Left Join Employee as e On co.employeeid = e.id 
  Left Join Customer as c On co.customerid = c.id 
  ${whereClauses} ${orderClauses}`;
  const db = await getDb();
  return await db.all(sql`${joinClauses}`);
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
  let whereClauses = sql`WHERE co.customerid='${customerId}'`;
  return getAllOrders(opts, whereClauses);
}

/**
 * Retrieve an individual CustomerOrder record by id
 * @param {string | number} id CustomerOrder id
 * @returns {Promise<Order>} the order
 */
export async function getOrder(id) {
  const db = await getDb();
  //experiment
  let joinClauses = sql`SELECT sum((1 - od.discount) * od.unitprice * od.quantity) as subtotal, co.*,c.contactname as customername, e.firstname as employeename
  FROM CustomerOrder as co 
  inner join OrderDetail as od on od.orderid = co.id
  Left Join Customer as c On  co.customerid = c.id 
  Left Join Employee as e On co.employeeid = e.id WHERE co.id = ${id}`;
  return await db.get(sql`${joinClauses}`);
}

/**
 * Get the OrderDetail records associated with a particular CustomerOrder record
 * @param {string | number} id CustomerOrder id
 * @returns {Promise<OrderDetail[]>} the order details
 */
export async function getOrderDetails(id) {
  const db = await getDb();
  let joinClauses = '';
  joinClauses = sql`SELECT od.*,od.unitprice * od.quantity as price, p.productname 
  FROM OrderDetail as od
  Left Join Product as p On od.productid = p.id
  WHERE od.orderid = ${id}`;
  return await db.all(sql`${joinClauses}`);
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
  // let result;
  // try {
  //   db.run(sql`Begin `);
  //   result = await db.all(sql`${joinClauses}`);

  //   db.run(sql`Commit`);
  //   throw 'Error';
  //   // return result;
  // } catch (error) {
  //   db.run(sql`RollBack`);
  // }
  try {
    await db.run(sql`Begin`);
    let result = await db.run(
      sql`Insert Into CustomerOrder (employeeid,customerid,shipcity,shipaddress,shipname,shipvia,shipregion,shipcountry,shippostalcode,requireddate,freight) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      order.employeeid,
      order.customerid,
      order.shipcity,
      order.shipaddress,
      order.shipname,
      order.shipvia,
      order.shipregion,
      order.shipcountry,
      order.shippostalcode,
      order.requireddate,
      order.freight
    );
    if (!result || typeof result.lastID === 'undefined')
      throw new Error('Order insertion did not return an id!');
    let ct = 1;
    let orderId = result.lastID;
    let detailsResult = details.map(x => {
      return db.run(
        sql`Insert Into OrderDetail (id,orderid,productid, unitprice, quantity, discount) values ($1,$2,$3,$4,$5,$6)`,
        `${orderId}/${ct++}`,
        orderId,
        x.productid,
        x.unitprice,
        x.quantity,
        x.discount
      );
    });
    await Promise.all(detailsResult);
    await db.run(sql`Commit`);
    return { id: result.lastID };
  } catch (error) {
    db.run(sql`RollBack`);
    throw error;
  }
}

/**
 * Delete a CustomerOrder from the database
 * @param {string | number} id CustomerOrder id
 * @returns {Promise<any>}
 */
export async function deleteOrder(id) {
  const db = await getDb();
  return await db.run(sql`Delete from CustomerOrder where id=$1`, id);
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
