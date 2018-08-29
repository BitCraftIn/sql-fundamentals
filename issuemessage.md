Hello,

- OS type and version `MacOS 10.13.6`
- DB: `mysql v8.0.12`
- DB Installation type: `brew`
- Node version `v10.6.0`

When running the setup script [mysql.sh](scripts/db/setup/mysql.sh) via `npm run db:setup:mysql`, the `mysql` and `mysqladmin` commands do not make use of the login config file created in the [setup process](MYSQL_SETUP.md). We saw the following output:

```
- Removing any existing northwind database (you may need to provide a password)
mysqladmin: connect to server at 'localhost' failed
error: 'Access denied for user 'akshay'@'localhost' (using password: NO)'
 - Removing any existing northwind_user user
ERROR 1045 (28000): Access denied for user 'akshay'@'localhost' (using password: NO)
 - Creating northwind_user
ERROR 1045 (28000): Access denied for user 'akshay'@'localhost' (using password: NO)
 - Creating northwind database
mysqladmin: connect to server at 'localhost' failed
error: 'Access denied for user 'akshay'@'localhost' (using password: NO)'
 - Granting all northwind database permissions to northwind_user
ERROR 1045 (28000): Access denied for user 'root'@'localhost' (using password: NO)
 - Setting up schema from ./sql/northwind.mysql.sql
ERROR 1045 (28000): Access denied for user 'akshay'@'localhost' (using password: NO)
 - Importing data from ./sql/northwind_data.sql (this may take a while)
ERROR 1045 (28000): Access denied for user 'akshay'@'localhost' (using password: NO)
```

We resolved the issue by adding aliases in the [mysql.sh](scripts/db/setup/mysql.sh) file like so:

```sh
alias mysqladmin='mysqladmin --login-path=local'
alias mysql='mysql --login-path=local'
```

I am unsure if this is relevant to all operating systems and all versions of mysql.

I intend to make a PR but would like to wait until I finish the course so that I can ensure that my PR includes fixes to all instances of this specific issue.

Akshay Barad\
[BitCraft](https://bitcraft.in)

[#Error](https://stackoverflow.com/questions/19372095/mysql-config-editor-login-path-local-not-working/21019675)
