-- Put your MySQL "down" migration here
DROP INDEX employeereportsto ON Employee;
DROP INDEX productsupplierid ON Product;
DROP INDEX orderemployeeid ON CustomerOrder;
DROP INDEX ordercustomerid ON CustomerOrder;
DROP INDEX orderdetailproductid ON OrderDetail;
DROP INDEX orderdetailorderid ON OrderDetail;