-- Put your MySQL "down" migration here
DROP TABLE CustomerOrderTransaction;

DROP INDEX orderdetailuniqueproduct ON OrderDetail;

