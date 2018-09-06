-- Put your MySQL "up" migration here
CREATE TABLE CustomerOrderTransaction(
    id INT PRIMARY KEY AUTO_INCREMENT,
    auth VARCHAR(255),
    orderid VARCHAR(255) NOT NULL REFERENCES CustomerOrder(id)
);


CREATE UNIQUE INDEX orderdetailuniqueproduct ON OrderDetail(orderid,productid);

-- CREATE INDEX orderdetailuniqueproduct ON OrderDetail(productid);