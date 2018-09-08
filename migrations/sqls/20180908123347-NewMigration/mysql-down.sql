-- Put your MySQL "down" migration here
ALTER TABLE OrderDetail DROP INDEX orderdetailproductid;
ALTER TABLE OrderDetail DROP INDEX orderdetailorderid;
ALTER TABLE CustomerOrder DROP INDEX orderemployeeid;
ALTER TABLE CustomerOrder DROP INDEX ordercustomerid;
ALTER TABLE Product DROP INDEX productsupplierid;
ALTER TABLE Employee DROP INDEX employeereportsto;
