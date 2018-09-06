-- Put your MySQL "up" migration here
CREATE INDEX employeereportsto ON Employee(reportsto);
CREATE INDEX productsupplierid ON Product(supplierid);
CREATE INDEX orderemployeeid ON CustomerOrder(employeeid);
CREATE INDEX ordercustomerid ON CustomerOrder(id);
CREATE INDEX orderdetailproductid ON OrderDetail(productid);
CREATE INDEX orderdetailorderid ON OrderDetail(orderid);